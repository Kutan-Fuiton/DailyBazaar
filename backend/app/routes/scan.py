from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import date
from pathlib import Path
import shutil
import uuid

from ..core.deps import get_current_user, get_user_db
from ..core.limiter import limiter
from ..models.user import User
from ..models.scan import Scan
from ..models.item import Item, ItemPriceHistory
from ..models.transaction import Transaction, TransactionItem
from ..models.location import MarketPriceHistory
from ..schemas.scan import ScanResponse, ScanConfirmRequest, ParsedItem
from ..schemas.transaction import TransactionResponse
from ..services.matching_service import match_item_name
from ..services.unit_service import parse_qty_int, compute_unit_price
from ..services.suggestion_service import build_suggestions
from ..services.ocr_personalization_service import PersonalisedOCRContext, record_ocr_feedback
from ..core.cache import invalidate_user_caches, invalidate_market_price_cache
from ..ocr.llama_parsing import extract_handwritten_list

ROOT_DIR = Path(__file__).resolve().parents[3]
APP_DIR  = Path(__file__).resolve().parents[1]

router = APIRouter(prefix="/scan", tags=["Scan"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}


@router.post("", response_model=ScanResponse)
@limiter.limit("15/hour")
async def scan_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")

    upload_dir = ROOT_DIR / "backend" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    # Sanitize and randomize filename to prevent directory traversal
    clean_orig_name = Path(file.filename or "receipt.jpg").name
    safe_filename = f"{uuid.uuid4().hex}_{clean_orig_name}"
    input_path = upload_dir / safe_filename

    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    output_path = APP_DIR / "ocr" / "Result" / "extracted.json"

    try:
        parsed = extract_handwritten_list(image_path=input_path, save_json=True, output_path=output_path)
    except RuntimeError as e:
        raise HTTPException(500, str(e))
    except Exception as e:
        raise HTTPException(500, f"OCR failed: {str(e)}")

    scan = Scan(
        raw_ocr_text=parsed.get("raw_text", ""),
        parsed_data=parsed,
        confidence=parsed.get("confidence", 0.0),
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    ocr_ctx = PersonalisedOCRContext(current_user.id, db)

    parsed_items: list[ParsedItem] = []
    for raw_item in parsed.get("items", []):
        name       = raw_item.get("name") or raw_item.get("item_name") or ""
        raw_price  = raw_item.get("price") or raw_item.get("item_price") or 0.0
        raw_amount = raw_item.get("amount")          # may be int or None
        raw_unit   = raw_item.get("unit")            # may be a unit string or None

        # ── Normalise quantity ───────────────────────────────────────────────
        pq = parse_qty_int(raw_amount, raw_unit)

        # ── Per-unit price ───────────────────────────────────────────────────
        unit_price = compute_unit_price(raw_price, pq.normalized_qty)

        # ── Personalised Matching & Suggestions ──────────────────────────────
        matched = ocr_ctx.match(name) if name else None
        suggestions = build_suggestions(
            item=matched,
            normalized_qty=pq.normalized_qty,
            total_price=raw_price,
            unit_family=pq.unit_family,
            db=db,
        )

        parsed_items.append(
            ParsedItem(
                name=matched.name if matched else name,
                qty=pq.raw_value,
                price=float(raw_price),
                unit=pq.unit,
                raw=raw_item.get("raw") or raw_item.get("raw_text") or name,
                display_qty=pq.display_qty,
                normalized_qty=pq.normalized_qty,
                unit_family=pq.unit_family,
                unit_price=unit_price,
                **suggestions,
            )
        )

    return ScanResponse(
        scan_id=scan.id,
        raw_ocr_text=parsed.get("raw_text", ""),
        parsed_items=parsed_items,
        confidence=parsed.get("confidence", 0.0),
        total_amount=parsed.get("total_amount"),
    )


@router.post("/confirm", response_model=TransactionResponse, status_code=201)
def confirm_scan(
    body: ScanConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_db),
):
    """
    Converts a reviewed OCR scan into a permanent Transaction.
    Feeds user corrections into the self-learning Lexicon engine.
    """
    calculated_total = sum(item.price or 0 for item in body.items)

    # ── Parsed-vs-calculated total mismatch check ────────────────────────────
    if body.parsed_total is not None:
        difference = abs(body.parsed_total - calculated_total)
        if difference > 1.0:
            raise HTTPException(
                status_code=422,
                detail={
                    "error":       "total_mismatch",
                    "message":     "Bill total and item total do not match. Please review the items.",
                    "parsed_total":     round(body.parsed_total, 2),
                    "calculated_total": round(calculated_total, 2),
                    "difference":       round(difference, 2),
                },
            )

    haul_title = body.title.strip() if (body.title and body.title.strip()) else None
    if not haul_title:
        user_tx_count = db.query(Transaction).filter(Transaction.user_id == current_user.id).count() + 1
        today_str = date.today().strftime("%d %b")
        haul_title = f"Bazaar Haul #{user_tx_count} ({today_str})"

    tx = Transaction(
        title=haul_title,
        total=calculated_total,
        source="OCR",
        status=body.status,
        location_id=body.location_id,
        user_id=current_user.id,
    )
    db.add(tx)
    db.flush()

    today = date.today()

    for item_data in body.items:
        # ── Re-derive normalised values in case frontend updated qty/price ───
        from ..services.unit_service import parse_qty_int as _pqi, compute_unit_price as _cup

        if item_data.normalized_qty:
            n_qty       = item_data.normalized_qty
            unit_fam    = item_data.unit_family or "count"
            canon_unit  = item_data.unit or "piece"
            display_qty = item_data.display_qty or str(item_data.qty)
        else:
            pq          = _pqi(item_data.qty, item_data.unit)
            n_qty       = pq.normalized_qty
            unit_fam    = pq.unit_family
            canon_unit  = pq.unit
            display_qty = pq.display_qty

        unit_price = _cup(item_data.price, n_qty)

        # ── Match or create item in catalog ──────────────────────────────────
        matched = match_item_name(item_data.name, db, current_user.id)

        if matched:
            if matched.id is None:
                # Promote transient lexicon match into user's catalog
                matched.user_id = current_user.id
                db.add(matched)
                db.flush()
            matched.price_per_unit = unit_price or matched.price_per_unit
            if unit_fam:
                matched.unit_family = unit_fam
        else:
            existing = (
                db.query(Item)
                .filter(Item.user_id == current_user.id, Item.name.ilike(item_data.name.strip()))
                .first()
            )
            if existing:
                existing.price_per_unit = unit_price or existing.price_per_unit
                if unit_fam:
                    existing.unit_family = unit_fam
                matched = existing
            else:
                new_item = Item(
                    user_id=current_user.id,
                    name=item_data.name.strip().title(),
                    unit=canon_unit,
                    unit_family=unit_fam,
                    price_per_unit=unit_price,
                )
                db.add(new_item)
                db.flush()
                matched = new_item

        # ── Save TransactionItem with all normalised columns ─────────────────
        db.add(TransactionItem(
            transaction_id=tx.id,
            item_id=matched.id if (matched and matched.id) else None,
            name=item_data.name,
            qty=item_data.qty or n_qty,
            price=item_data.price or 0.0,
            unit=canon_unit,
            display_qty=display_qty,
            normalized_qty=n_qty,
            unit_family=unit_fam,
            unit_price=unit_price,
        ))

        # ── Update ItemPriceHistory with unit_price ──────────────────────────
        if matched and matched.id:
            db.add(ItemPriceHistory(
                item_id=matched.id,
                price=item_data.price or 0.0,
                unit_price=unit_price,
                unit_family=unit_fam,
                recorded_at=today,
            ))

        # ── Market price history (location-based) ─────────────────────────────
        if body.location_id:
            db.add(MarketPriceHistory(
                item_name=matched.name if matched else item_data.name,
                location_id=body.location_id,
                price=item_data.price or 0.0,
                unit=canon_unit,
                recorded_at=today,
            ))

        # ── Adaptive Learning: Record OCR Feedback / Alias Confirmation ──────
        raw_name = item_data.raw or ""
        if raw_name and raw_name.strip().lower() != item_data.name.strip().lower():
            record_ocr_feedback(
                db=db,
                raw_input=raw_name,
                suggested_match=matched.name if matched else None,
                user_corrected=item_data.name,
                source="ocr",
                user_id=current_user.id,
            )

    # ── Link scan record back to the new transaction ─────────────────────────
    scan = db.query(Scan).filter(Scan.id == body.scan_id).first()
    if scan:
        scan.transaction_id = tx.id

    db.commit()
    db.refresh(tx)

    # Invalidate dashboard and items caches
    invalidate_user_caches(current_user.id)
    if body.location_id:
        for item_data in body.items:
            invalidate_market_price_cache(body.location_id, item_data.name)

    return tx