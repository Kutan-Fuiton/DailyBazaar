"""
services/ocr_service.py
OCR pipeline for Spendly bill scanning.

Primary engine: EasyOCR with image preprocessing for better accuracy.
Fallback: GLM-OCR via HuggingFace (if HF_TOKEN set and model available).

Key improvements:
- Preprocessing: grayscale + contrast enhancement for handwritten text
- Low confidence threshold (0.05) to catch faint detections
- Price normalisation: "12 8" → 128 (digit-groups joined)
- Column split uses actual image width, not detected text bounds
"""
import sys, os, io, re
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np

OCR_DIR = Path(__file__).resolve().parents[3] / "OCR"
sys.path.insert(0, str(OCR_DIR))

from ..core.config import settings

# ── Lazy-loaded engines ─────────────────────────────────────────────────────
_easyocr_reader = None
_glm_model = None
_glm_processor = None


def _load_easyocr():
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            import easyocr
            _easyocr_reader = easyocr.Reader(["en"], verbose=False)
            print("[OCR] EasyOCR loaded OK")
        except Exception as e:
            print(f"[OCR] EasyOCR load failed: {e}")
            _easyocr_reader = False
    return _easyocr_reader not in (None, False)


def _load_glm():
    global _glm_model, _glm_processor
    if _glm_model is None:
        try:
            from transformers import AutoProcessor, AutoModelForImageTextToText
            os.environ.setdefault("HF_TOKEN", settings.HF_TOKEN)
            _glm_processor = AutoProcessor.from_pretrained(
                "zai-org/GLM-OCR", token=settings.HF_TOKEN
            )
            _glm_model = AutoModelForImageTextToText.from_pretrained(
                "zai-org/GLM-OCR",
                torch_dtype="auto",
                token=settings.HF_TOKEN,
                device_map="auto",
            )
            print("[OCR] GLM-OCR loaded OK")
        except Exception as e:
            print(f"[OCR] GLM-OCR load failed: {e} — using EasyOCR only")
            _glm_model = False
    return _glm_model not in (None, False)


# ── Image preprocessing ─────────────────────────────────────────────────────

def _preprocess(image: Image.Image) -> Image.Image:
    """Enhance handwritten text clarity for better EasyOCR accuracy."""
    # 1. Convert to grayscale
    img = image.convert("L")
    # 2. Boost contrast strongly
    img = ImageEnhance.Contrast(img).enhance(2.5)
    # 3. Sharpen edges
    img = img.filter(ImageFilter.SHARPEN)
    # 4. Scale up if small (EasyOCR works better on larger images)
    w, h = img.size
    if w < 800:
        scale = 800 / w
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    # 5. Convert back to RGB for EasyOCR
    return img.convert("RGB")


# ── Price and name helpers ───────────────────────────────────────────────────

def _normalise_price_text(text: str) -> str:
    """
    Normalise common handwriting OCR misreads in price context.
    '12 8' → '128', '3?' → '37', 'l'→'1', 'O'→'0'
    """
    # Handwriting misreads in numeric context
    text = text.replace("?", "7")      # '3?' → '37'
    text = text.replace("l", "1").replace("I", "1").replace("|", "1")
    text = text.replace("O", "0").replace("o", "0")
    text = text.replace("/", "1")      # '3 / 6' fragments
    # Remove noise, spaces between digits (join digit groups)
    text = re.sub(r"(?<=\d)\s+(?=\d)", "", text)  # '12 8' → '128'
    text = re.sub(r"[?_|₹Rs.\s]", "", text)
    return text


def _is_price(text: str) -> tuple[bool, float]:
    """Returns (is_price, value). Handles '12 8' type split digits."""
    # Join digit groups: '12 8' → '128'
    joined = re.sub(r"(?<=\d)\s+(?=\d)", "", text)
    cleaned = _normalise_price_text(joined)
    if re.fullmatch(r"\d+(\.\d{1,2})?", cleaned):
        try:
            return True, float(cleaned)
        except ValueError:
            pass
    return False, 0.0


def _is_item_name(text: str) -> bool:
    """True if text has at least 2 letters and is not purely numeric."""
    letters = re.findall(r"[a-zA-Z]", text)
    return len(letters) >= 2


# ── Column pairing ───────────────────────────────────────────────────────────

def _pair_items_and_prices(ocr_results: list, img_width: int) -> list:
    """
    Match left-column item names with right-column prices.
    Uses the image's actual pixel width for the split, not detected text bounds.
    """
    if not ocr_results:
        return []

    split_x = img_width * 0.55   # items on left (<55%), prices on right (>55%)

    items = []   # {text, y, x}
    prices = []  # {price, y}

    for bbox, text, conf in ocr_results:
        if conf < 0.05:          # very lenient — catch faint "Oil" etc.
            continue
        text = text.strip()
        if not text:
            continue

        centre_x = sum(pt[0] for pt in bbox) / 4
        centre_y = sum(pt[1] for pt in bbox) / 4

        ok_price, price_val = _is_price(text)

        if centre_x >= split_x and ok_price and price_val > 0:
            prices.append({"price": price_val, "y": centre_y})
        elif centre_x < split_x and _is_item_name(text):
            items.append({"text": text.strip("_- "), "y": centre_y})

    # Sort by vertical position
    items.sort(key=lambda x: x["y"])
    prices.sort(key=lambda x: x["y"])

    print(f"[OCR] Left column items: {[i['text'] for i in items]}")
    print(f"[OCR] Right column prices: {[p['price'] for p in prices]}")

    # Pair each item to the closest price by y-distance
    paired = []
    used_prices = set()
    img_height_approx = max((p["y"] for p in prices), default=1000)
    max_gap = img_height_approx * 0.15  # 15% of image height

    for item in items:
        best_idx, best_dist = -1, float("inf")
        for idx, price in enumerate(prices):
            if idx in used_prices:
                continue
            dist = abs(price["y"] - item["y"])
            if dist < best_dist:
                best_dist, best_idx = dist, idx
        if best_idx >= 0 and best_dist <= max_gap:
            used_prices.add(best_idx)
            paired.append({
                "name": items[items.index(item)]["text"],
                "qty": 1.0,
                "price": prices[best_idx]["price"],
                "unit": None,
                "raw": f"{items[items.index(item)]['text']} {prices[best_idx]['price']}",
            })

    # Filter out the bill total if present (last row whose price ≈ sum of rest)
    if len(paired) > 1:
        rest_sum = sum(p["price"] for p in paired[:-1])
        last = paired[-1]["price"]
        if abs(last - rest_sum) / max(rest_sum, 1) < 0.05:
            paired = paired[:-1]

    return paired


# ── Engine runners ───────────────────────────────────────────────────────────

def _run_easyocr(image: Image.Image) -> list:
    if not _load_easyocr():
        return []
    preprocessed = _preprocess(image)
    img_array = np.array(preprocessed)
    results = _easyocr_reader.readtext(img_array)
    print(f"[OCR] Raw EasyOCR detections: {[(t, round(c,2)) for _, t, c in results]}")
    return _pair_items_and_prices(results, preprocessed.width)


def _run_glm(image: Image.Image):
    if not _load_glm():
        return "", []
    import torch
    from .parsing_service import parse_glm_output
    prompt = (
        "Extract all items, quantities, and prices from this grocery receipt. "
        "List each item on a new line as: item_name | quantity | price"
    )
    messages = [{"role": "user", "content": [
        {"type": "image", "image": image},
        {"type": "text", "text": prompt}
    ]}]
    inputs = _glm_processor.apply_chat_template(
        messages, tokenize=True, add_generation_prompt=True,
        return_dict=True, return_tensors="pt"
    ).to(_glm_model.device)
    inputs.pop("token_type_ids", None)
    with torch.no_grad():
        generated_ids = _glm_model.generate(**inputs, max_new_tokens=2048)
    raw_text = _glm_processor.decode(
        generated_ids[0][inputs["input_ids"].shape[1]:], skip_special_tokens=False
    )
    return raw_text, parse_glm_output(raw_text) if raw_text else []


# ── Public API ────────────────────────────────────────────────────────────────

async def process_uploaded_image(file_bytes: bytes, filename: str) -> dict:
    """
    Local OCR pipeline has been disabled. The application is configured to use the cloud LlamaParsing
    implementation exclusively. If you need local OCR again, restore the EasyOCR pipeline in
    this module or remove this exception.
    """
    raise RuntimeError(
        "Local OCR pipeline disabled: backend is configured to use LlamaParsing only. "
        "Install and configure the LlamaParsing/llama_cloud dependencies and ensure OCR/LlamaParsing.py is present."
    )
