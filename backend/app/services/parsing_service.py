"""
services/parsing_service.py — Smart format-agnostic list & bill text parser.

Contains two parsers:
  1. parse_glm_output()     — for GLM-OCR formatted bill text (pipe-separated or heuristic)
  2. parse_natural_list()   — Format-agnostic shopping list parser.
                              No fixed format required. The parser classifies tokens
                              into item name, quantity, unit, and price using:
                              - Attached unit detection (100g, 1kg, 2L)
                              - Currency prefix detection (₹30, Rs50)
                              - Magnitude-based disambiguation for bare numbers
                                (small numbers ≤ 5 → likely quantity; >20 → likely price)
                              - Confidence flags for ambiguous entries
"""
import re
from typing import List, Dict, Any, Optional


# ─────────────────────────────────────────────────────────────────────────────
# Parser 1 — OCR bill text parser (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

def parse_glm_output(raw_text: str) -> List[Dict[str, Any]]:
    """
    Expects GLM-OCR output in format: item_name | quantity | price
    Falls back to heuristic line parsing for other formats.
    """
    items = []
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
    for line in lines:
        item = _parse_pipe_format(line) or _parse_heuristic(line)
        if item:
            items.append(item)
    return items


def _parse_pipe_format(line: str) -> Dict | None:
    """Parse: item name | qty | price"""
    parts = [p.strip() for p in line.split("|")]
    if len(parts) >= 3:
        name = parts[0]
        qty = _extract_number(parts[1]) or 1.0
        price = _extract_number(parts[2]) or 0.0
        if name and price:
            return {"name": name, "qty": qty, "price": price, "unit": None, "raw": line}
    return None


def _parse_heuristic(line: str) -> Dict | None:
    """Heuristic: last number is price, second-last is qty (if present)."""
    line_clean = re.sub(r"[₹Rs\.]+", "", line)
    numbers = re.findall(r"\d+(?:,\d+)*(?:\.\d+)?", line_clean)
    numbers = [float(n.replace(",", "")) for n in numbers]
    name = re.sub(r"[\d,₹Rs\.\|×xX]+", "", line).strip()
    name = re.sub(r"\s{2,}", " ", name).strip()
    if not name or not numbers:
        return None
    price = numbers[-1]
    qty = numbers[-2] if len(numbers) >= 2 else 1.0
    if price <= 0:
        return None
    return {"name": name, "qty": qty, "price": price, "unit": None, "raw": line}


def _extract_number(text: str) -> float | None:
    text = re.sub(r"[₹Rs\.,\s]", "", text)
    try:
        return float(text)
    except ValueError:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Parser 2 — Format-agnostic natural shopping list parser
# ─────────────────────────────────────────────────────────────────────────────

# Canonical unit map
_UNIT_MAP: Dict[str, str] = {
    # Mass
    "kg": "kg", "kgs": "kg", "kilo": "kg", "kilos": "kg",
    "g": "g", "gm": "g", "gms": "g", "gram": "g", "grams": "g",
    # Volume
    "l": "L", "lt": "L", "ltr": "L", "litre": "L", "litres": "L",
    "liter": "L", "liters": "L",
    "ml": "ml", "mls": "ml", "millilitre": "ml", "milliliter": "ml",
    # Count
    "pc": "pc", "pcs": "pc", "piece": "pc", "pieces": "pc",
    "no": "pc", "nos": "pc", "num": "pc",
    "packet": "packet", "pack": "packet", "pkt": "packet",
    "dozen": "dozen", "dz": "dozen",
}

# Known grocery count multiples → always treat as quantity, not price
_COUNT_MULTIPLES = {1, 2, 3, 4, 5, 6, 10, 12, 24, 36, 48}

# Currency prefixes
_CURRENCY_RE = re.compile(r"^[₹$€£]|^Rs\.?\s*", re.IGNORECASE)

# Attached or space-separated qty+unit (e.g. "100g", "100 g", "1kg", "1 kg", "500ml", "1L", "2 L", "2 pcs")
_ATTACHED_QTY_UNIT_RE = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*(kg|kgs?|gm?s?|grams?|ml|mls?|ltr?s?|litres?|liters?|l|lt|pcs?|pieces?|packets?|pkt|dozen|dz)\b",
    re.IGNORECASE,
)

# Standalone number (possibly with currency prefix)
_NUMBER_TOKEN_RE = re.compile(r"(?:^|(?<=\s))((?:[₹$€£]|Rs\.?\s*)?\d+(?:\.\d+)?)\b", re.IGNORECASE)


def parse_natural_list(text: str) -> List[Dict[str, Any]]:
    """
    Parse a multi-line free-form shopping list typed by the user.

    Format is deliberately unrestricted — users can write in any order,
    any language romanization. One item per line.

    Examples handled:
        posto 100g 110          → {name: posto, qty: 100, unit: g, price: 110, confidence: high}
        alu 1kg                 → {name: alu, qty: 1, unit: kg, price: None, confidence: high}
        dim 12                  → {name: dim, qty: 12 (count multiple), price: None, confidence: high}
        peyaj 45                → {name: peyaj, qty: None, price: 45, confidence: high}
        maggie 2 12             → {name: maggie, qty: 2, price: 12, confidence: high}
        maggie 10               → {name: maggie, qty/price: 10, confidence: low}
        ₹50 sarson oil          → {name: sarson oil, price: 50, confidence: high}
        mustard oil 1L ₹140     → {name: mustard oil, qty: 1, unit: L, price: 140, confidence: high}
    """
    results = []
    lines = [line.strip() for line in text.strip().split("\n") if line.strip()]
    for line in lines:
        parsed = _parse_line(line)
        if parsed:
            results.append(parsed)
    return results


def _parse_line(line: str) -> Optional[Dict[str, Any]]:
    """Tokenize a single line and classify tokens into name, qty, unit, price."""
    if not line:
        return None

    line = line.strip()
    # Remove leading bullets / dashes / numbers
    line = re.sub(r"^[\-\*•\d]+[\.\)]\s*", "", line).strip()

    remaining = line
    qty: Optional[float] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    confidence: str = "high"
    shop: Optional[str] = None

    # ── Step 0: Extract shop/dokan name (@ShopName or shop: DokanName) ──
    shop_match = re.search(r"@([a-zA-Z0-9_\u0980-\u09FF\u0900-\u097F\s\-]+?)(?=\s+\d|\s+₹|\s+Rs|\s*$|@)", remaining)
    if not shop_match:
        shop_match = re.search(r"(?:shop|dokan):\s*([a-zA-Z0-9_\u0980-\u09FF\u0900-\u097F\s\-]+?)(?=\s+\d|\s+₹|\s+Rs|\s*$)", remaining, re.IGNORECASE)
    if shop_match:
        shop = shop_match.group(1).strip()
        remaining = (remaining[:shop_match.start()] + " " + remaining[shop_match.end():]).strip()

    # ── Step 1: Find attached qty+unit tokens (100g, 1kg, 500ml) ──
    attached = _ATTACHED_QTY_UNIT_RE.search(remaining)
    if attached:
        qty = float(attached.group(1))
        raw_unit = attached.group(2).lower()
        unit = _UNIT_MAP.get(raw_unit, raw_unit)
        remaining = (remaining[:attached.start()] + remaining[attached.end():]).strip()

    # ── Step 2: Find currency-prefixed price tokens (₹140, Rs50) ──
    currency_tokens = re.findall(r"(?:[₹$€£]|Rs\.?\s*)(\d+(?:\.\d+)?)", remaining, re.IGNORECASE)
    if currency_tokens:
        price = float(currency_tokens[-1])
        # Remove currency price token from remaining
        remaining = re.sub(r"(?:[₹$€£]|Rs\.?\s*)\d+(?:\.\d+)?", "", remaining, flags=re.IGNORECASE).strip()

    # ── Step 3: Collect remaining bare numbers ──
    bare_numbers = re.findall(r"\b(\d+(?:\.\d+)?)\b", remaining)
    bare_values = [float(n) for n in bare_numbers]

    # Remove bare numbers from the remaining text to extract name
    name = re.sub(r"\b\d+(?:\.\d+)?\b", "", remaining).strip()
    name = re.sub(r"\s{2,}", " ", name).strip()

    # ── Step 4: Disambiguate bare numbers into qty / price ──
    for val in bare_values:
        if qty is None and unit is None:
            # Check if it looks like a quantity
            if val in _COUNT_MULTIPLES or val <= 5.0:
                qty = val
                confidence = "high" if val in _COUNT_MULTIPLES or val <= 5.0 else "medium"
            elif val > 20.0:
                # Almost certainly a price
                if price is None:
                    price = val
                else:
                    qty = val  # second large number → treat as qty
            elif 6.0 <= val <= 20.0:
                # Ambiguous zone
                if price is None and qty is not None:
                    price = val
                elif price is None:
                    # Single number in grey zone — flag as low confidence
                    price = val
                    confidence = "low"
        else:
            # qty already set from attached unit — remaining bare number → price
            if price is None:
                price = val

    # ── Step 5: Sanity check — if no name was extracted, try the original line ──
    if not name:
        name = line

    # Strip leftover punctuation from name
    name = re.sub(r"[₹,\.\|×xX]+", " ", name).strip()
    name = re.sub(r"\s{2,}", " ", name).strip()

    if not name:
        return None

    return {
        "name": name,
        "quantity": qty,
        "unit": unit,
        "price": price,
        "confidence": confidence,
        "raw": line,
        "shop": shop,
    }
