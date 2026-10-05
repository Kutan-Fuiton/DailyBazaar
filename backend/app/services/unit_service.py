"""
services/unit_service.py — Unit normalisation for OCR scanned quantities.

Implements the unit-family rules from STATISTICAL_MEASURES.md:
  mass   → normalise to kg  (g, gm, gr, kgs all → kg)
  volume → normalise to L   (ml, mL, lt, ltr, litre → L)
  count  → keep as piece    (pc, pcs, ta, nos, piece, pieces)

Public API
----------
parse_raw_qty(raw)  → ParsedQty
compute_unit_price(total_price, normalized_qty) → float | None
"""
from __future__ import annotations
import re
from dataclasses import dataclass
from typing import Optional

# ── Unit family tables ────────────────────────────────────────────────────────

# Maps lowercase alias → (canonical_unit, unit_family, conversion_factor_to_canonical)
# conversion_factor: multiply input value by this to get the canonical unit value
_UNIT_MAP: dict[str, tuple[str, str, float]] = {
    # mass — normalise to kg
    "g":      ("kg", "mass", 0.001),
    "gm":     ("kg", "mass", 0.001),
    "gr":     ("kg", "mass", 0.001),
    "gram":   ("kg", "mass", 0.001),
    "grams":  ("kg", "mass", 0.001),
    "kg":     ("kg", "mass", 1.0),
    "kgs":    ("kg", "mass", 1.0),
    "kilo":   ("kg", "mass", 1.0),

    # volume — normalise to L
    "ml":     ("L", "volume", 0.001),
    "ml.":    ("L", "volume", 0.001),
    "mL":     ("L", "volume", 0.001),
    "l":      ("L", "volume", 1.0),
    "L":      ("L", "volume", 1.0),
    "lt":     ("L", "volume", 1.0),
    "lta":    ("L", "volume", 1.0),
    "ltr":    ("L", "volume", 1.0),
    "litre":  ("L", "volume", 1.0),
    "litres": ("L", "volume", 1.0),
    "liter":  ("L", "volume", 1.0),
    "liters": ("L", "volume", 1.0),

    # count — keep as piece
    "pc":     ("piece", "count", 1.0),
    "pcs":    ("piece", "count", 1.0),
    "ta":     ("piece", "count", 1.0),
    "nos":    ("piece", "count", 1.0),
    "no":     ("piece", "count", 1.0),
    "piece":  ("piece", "count", 1.0),
    "pieces": ("piece", "count", 1.0),
    "each":   ("piece", "count", 1.0),
    "item":   ("piece", "count", 1.0),
    "items":  ("piece", "count", 1.0),
    "pkt":    ("piece", "count", 1.0),
    "pack":   ("piece", "count", 1.0),
    "packet": ("piece", "count", 1.0),
}

# Regex: optional leading number (int or decimal), optional space, then unit letters
# Examples: "500g", "1.5 kg", "330mL", "2pc", "1 litre", "1ta", "1ltr", "1lt"
_QTY_RE = re.compile(
    r"^\s*(?P<value>[0-9]+(?:\.[0-9]+)?)\s*(?P<unit>[a-zA-Z]+\.?)\s*$",
    re.IGNORECASE,
)


@dataclass
class ParsedQty:
    display_qty:    str             # original raw string, for UI
    normalized_qty: float           # converted to canonical unit
    unit:           str             # canonical unit: "kg" | "L" | "piece"
    unit_family:    str             # "mass" | "volume" | "count"
    raw_value:      float           # the number as-parsed before conversion
    raw_unit:       str             # the unit token as-parsed


def sanitize_qty_token(raw_str: str) -> str:
    """Fix duplicate token patterns like 500gg -> 500g, 1ltr1ltr -> 1ltr."""
    s = str(raw_str).strip()
    # Replace repeated letter tokens like gg -> g, ltrltr -> ltr
    s = re.sub(r"([a-zA-Z]+)\1+", r"\1", s)
    # Replace repeated value+unit patterns like 1ltr1ltr -> 1ltr
    s = re.sub(r"^([0-9]+(?:\.[0-9]+)?\s*[a-zA-Z]+)\1+$", r"\1", s, flags=re.IGNORECASE)
    return s


def parse_raw_qty(raw: Optional[str | int | float]) -> ParsedQty:
    """
    Parse a raw OCR quantity string into a normalised ParsedQty.

    Examples
    --------
    >>> parse_raw_qty("500g")
    ParsedQty(display_qty='500g', normalized_qty=0.5, unit='kg', unit_family='mass', ...)
    >>> parse_raw_qty("1ta")
    ParsedQty(display_qty='1ta', normalized_qty=1.0, unit='piece', unit_family='count', ...)
    >>> parse_raw_qty("1ltr")
    ParsedQty(display_qty='1ltr', normalized_qty=1.0, unit='L', unit_family='volume', ...)
    >>> parse_raw_qty("500")  # bare number >= 50 in grocery list -> 500g -> 0.5 kg
    ParsedQty(display_qty='500g', normalized_qty=0.5, unit='kg', unit_family='mass', ...)
    """
    raw_str = sanitize_qty_token(str(raw)) if raw is not None else ""
    display = raw_str or "1 piece"

    m = _QTY_RE.match(raw_str)
    if not m:
        # Pure number with no unit string
        try:
            num = float(raw_str)
            # In bazaar grocery list context: bare numbers >= 50 (e.g. 50, 100, 200, 250, 300, 500) mean grams (g -> kg)
            if num >= 50:
                normalized = round(num * 0.001, 6)
                disp = f"{int(num) if num.is_integer() else num}g"
                return ParsedQty(
                    display_qty=disp,
                    normalized_qty=normalized,
                    unit="kg",
                    unit_family="mass",
                    raw_value=num,
                    raw_unit="g",
                )
            else:
                disp = f"{int(num) if num.is_integer() else num} piece"
                return ParsedQty(
                    display_qty=disp,
                    normalized_qty=num,
                    unit="piece",
                    unit_family="count",
                    raw_value=num,
                    raw_unit="piece",
                )
        except (ValueError, TypeError):
            return _default_piece(display)

    raw_value = float(m.group("value"))
    raw_unit_token = m.group("unit")

    # Lookup: try exact then lowercase
    entry = _UNIT_MAP.get(raw_unit_token) or _UNIT_MAP.get(raw_unit_token.lower())

    if entry is None:
        # Unknown unit — fall back to count/piece
        return ParsedQty(
            display_qty=display,
            normalized_qty=raw_value,
            unit="piece",
            unit_family="count",
            raw_value=raw_value,
            raw_unit=raw_unit_token,
        )

    canonical_unit, unit_family, factor = entry
    normalized = round(raw_value * factor, 6)

    return ParsedQty(
        display_qty=display,
        normalized_qty=normalized,
        unit=canonical_unit,
        unit_family=unit_family,
        raw_value=raw_value,
        raw_unit=raw_unit_token,
    )


def parse_qty_int(value: Optional[int | float | str], unit: Optional[str] = None) -> ParsedQty:
    """
    Parse a numeric/string qty + optional separate unit string.
    """
    if value is None and not unit:
        return _default_piece("1 piece")

    val_str = sanitize_qty_token(str(value)) if value is not None else ""
    unit_str = sanitize_qty_token(str(unit)) if unit is not None else ""

    if val_str and unit_str:
        if val_str.lower().endswith(unit_str.lower()):
            combined = val_str
        else:
            combined = f"{val_str}{unit_str}"
        return parse_raw_qty(combined)
    elif val_str:
        return parse_raw_qty(val_str)
    elif unit_str:
        return parse_raw_qty(f"1{unit_str}")

    return _default_piece("1 piece")


def compute_unit_price(total_price: Optional[float], normalized_qty: float) -> Optional[float]:
    """
    unit_price = total_price / normalized_qty.
    Returns None if either value is falsy or qty is 0.
    """
    if not total_price or not normalized_qty:
        return None
    return round(total_price / normalized_qty, 4)


def _default_piece(display: str) -> ParsedQty:
    return ParsedQty(
        display_qty=display,
        normalized_qty=1.0,
        unit="piece",
        unit_family="count",
        raw_value=1.0,
        raw_unit="piece",
    )
