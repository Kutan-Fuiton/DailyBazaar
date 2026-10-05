from pydantic import BaseModel
from typing import Optional, List


class ParsedItem(BaseModel):
    name:   str
    qty:    Optional[float] = 1.0     # raw OCR numeric qty (backward compat)
    price:  Optional[float] = 0.0    # total price for this line
    unit:   Optional[str]   = None   # canonical unit: kg | L | piece
    raw:    Optional[str]   = None   # original OCR text before matching

    # ── Normalised fields (STATISTICAL_MEASURES.md) ───────────────────────────
    display_qty:    Optional[str]   = None   # human-readable: "500g", "2pc"
    normalized_qty: Optional[float] = None   # normalized to canonical unit
    unit_family:    Optional[str]   = None   # mass | volume | count
    unit_price:     Optional[float] = None   # price ÷ normalized_qty

    # ── Suggestions for missing values ─────────────────────────────────────────
    suggested_price: Optional[float] = None  # when price is missing/zero
    suggested_qty:   Optional[float] = None  # when qty is missing/zero
    suggested_unit:  Optional[str]   = None  # unit for the suggested qty


class ScanResponse(BaseModel):
    scan_id:       int
    raw_ocr_text:  str
    parsed_items:  List[ParsedItem]
    confidence:    float
    total_amount:  Optional[float] = None    # grand total from OCR if present


class ScanConfirmRequest(BaseModel):
    scan_id:     Optional[int]   = None
    title:       str             = ""
    items:       List[ParsedItem]
    location_id: Optional[int]   = None
    status:      str             = "completed"
    # OCR-extracted bill total sent by the client for server-side mismatch check.
    # If provided and differs from the calculated item sum by more than ₹1,
    # the backend returns HTTP 422 with a clear mismatch message (plan §15).
    parsed_total: Optional[float] = None


