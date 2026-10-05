"""
routes/shopping_lists.py — Shopping List CRUD + lifecycle + finalization.

Implements the full plan §8–§13 shopping list workflow:

  POST   /parse                         Parse natural text → structured items (no DB write)
  POST   /                              Create a shopping list
  GET    /                              List all user's shopping lists
  GET    /{list_id}                     Get one list with all items
  PATCH  /{list_id}/status              Advance list lifecycle status
  POST   /{list_id}/items               Add one item to a list
  PATCH  /{list_id}/items/{item_id}/bought  Toggle item as bought/unbought
  POST   /{list_id}/items/mark-all-bought   Mark all items as bought
  DELETE /{list_id}                     Delete a list (guards against active SHOPPING lists)
  POST   /{list_id}/finalize            Convert bought items → permanent Transaction
"""
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.deps import get_current_user, get_user_db
from ..models.item import Item, ItemPriceHistory
from ..models.location import MarketPriceHistory
from ..models.shopping_list import ListItem, ListItemSourceEnum, ListStatusEnum, ShoppingList
from ..models.transaction import Transaction, TransactionItem
from ..models.user import User
from ..schemas.shopping_list import (
    FinalizeRequest,
    ListItemCreate,
    ListItemResponse,
    MarkBoughtRequest,
    ParsedListItem,
    ParseTextRequest,
    ParseTextResponse,
    ShoppingListCreate,
    ShoppingListResponse,
    ShoppingListStatusUpdate,
)
from ..services.matching_service import match_item_name
from ..services.parsing_service import parse_natural_list
from ..services.suggestion_service import get_item_suggestion
from ..services.unit_service import compute_unit_price, parse_qty_int

router = APIRouter(prefix="/shopping-lists", tags=["Shopping Lists"])


# ── Valid status transitions (guard against nonsensical jumps) ────────────────
_ALLOWED_TRANSITIONS: dict[str, list[str]] = {
    "DRAFT":     ["SAVED", "CANCELLED"],
    "SAVED":     ["SHOPPING", "CANCELLED"],
    "SHOPPING":  ["COMPLETED", "CANCELLED"],
    "COMPLETED": [],    # terminal state
    "CANCELLED": [],    # terminal state
}


def _broadcast_list_event(user: User, event_type: str, data: dict):
    """Safely dispatches real-time WebSocket events to all household members."""
    household_id = getattr(user, "household_id", None)
    if not household_id:
        return
    import asyncio
    from ..core.ws_manager import ws_manager
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(
                ws_manager.broadcast_to_household(
                    household_id=household_id,
                    event_type=event_type,
                    data=data,
                    sender_user_id=user.id,
                )
            )
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# POST /parse — Natural language parse (stateless, no DB write)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/parse", response_model=ParseTextResponse)
def parse_shopping_text(
    body: ParseTextRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_db),
    location_id: Optional[int] = None,
):
    """
    Parse free-form shopping list text into structured items and attach
    historical price suggestions and crowdsourced market prices.
    """
    raw_items = parse_natural_list(body.text)

    enriched: List[ParsedListItem] = []
    for raw in raw_items:
        suggestion = get_item_suggestion(raw["name"], db, current_user.id, location_id=location_id)
        enriched.append(
            ParsedListItem(
                name=suggestion.get("matched_name") or raw["name"],
                quantity=raw.get("quantity", 1.0),
                unit=raw.get("unit") or suggestion.get("suggested_unit"),
                suggested_price=suggestion.get("suggested_price"),
                suggested_unit=suggestion.get("suggested_unit"),
                user_last_price=suggestion.get("user_last_price"),
                market_price=suggestion.get("market_price"),
                category=suggestion.get("category"),
                emoji=suggestion.get("emoji"),
                price=raw.get("price"),
                confidence=raw.get("confidence", "high"),
                shop=raw.get("shop"),
            )
        )

    return ParseTextResponse(items=enriched, raw_text=body.text)


# ─────────────────────────────────────────────────────────────────────────────
# POST / — Create a shopping list
# ─────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=ShoppingListResponse, status_code=201)
def create_shopping_list(
    body: ShoppingListCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_db),
):
    """
    Create a new shopping list. Items can be passed in the body or added later
    via POST /{list_id}/items. The list starts with status SAVED by default.
    """
    shopping_list = ShoppingList(
        user_id=current_user.id,
        title=body.title.strip(),
        status=ListStatusEnum.SAVED,
    )
    db.add(shopping_list)
    db.flush()  # get shopping_list.id without committing

    for item_data in body.items:
        suggestion = get_item_suggestion(item_data.name, db, current_user.id)
        matched_item = match_item_name(item_data.name, db, current_user.id)

        db.add(ListItem(
            shopping_list_id=shopping_list.id,
            item_id=matched_item.id if matched_item else None,
            name=item_data.name.strip(),
            quantity=item_data.quantity or 1.0,
            unit=item_data.unit or (matched_item.unit if matched_item else None),
            suggested_price=suggestion.get("suggested_price"),
            user_price=item_data.user_price,
            source=item_data.source or ListItemSourceEnum.MANUAL,
        ))

    db.commit()
    db.refresh(shopping_list)
    return shopping_list


# ─────────────────────────────────────────────────────────────────────────────
# GET / — List all shopping lists for the user
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[ShoppingListResponse])
def list_shopping_lists(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_db),
):
    """
    Return all shopping lists for the authenticated user.
    Optionally filter by status (e.g. ?status=SHOPPING to get active lists).
    """
    q = db.query(ShoppingList).filter(ShoppingList.user_id == current_user.id)
    if status:
        q = q.filter(ShoppingList.status == status.upper())
    return q.order_by(ShoppingList.created_at.desc()).all()


# ─────────────────────────────────────────────────────────────────────────────
# GET /{list_id} — Get one list with all its items
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{list_id}", response_model=ShoppingListResponse)
def get_shopping_list(
    list_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_db),
):
    shopping_list = _get_list_or_404(list_id, current_user.id, db)
    return shopping_list


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /{list_id}/status — Advance the list lifecycle
# ─────────────────────────────────────────────────────────────────────────────

@router.patch("/{list_id}/status", response_model=ShoppingListResponse)
def update_list_status(
    list_id: int,
    body: ShoppingListStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_db),
):
    """
    Move the list to the next lifecycle stage.
    Invalid transitions (e.g. COMPLETED → SHOPPING) are rejected with HTTP 400.
    """
    shopping_list = _get_list_or_404(list_id, current_user.id, db)

    new_status = body.status.upper()
    current_status = shopping_list.status.value if hasattr(shopping_list.status, "value") else shopping_list.status

    allowed = _ALLOWED_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {current_status} to {new_status}. "
                   f"Allowed: {allowed or ['none — this is a terminal status']}",
        )

    shopping_list.status = ListStatusEnum(new_status)
    if new_status == "COMPLETED":
        shopping_list.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(shopping_list)
    return shopping_list


# ─────────────────────────────────────────────────────────────────────────────
# POST /{list_id}/items — Add a single item to an existing list
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{list_id}/items", response_model=ListItemResponse, status_code=201)
def add_item_to_list(
    list_id: int,
    body: ListItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_db),
):
    """
    Add a new item to a shopping list. Works for both pre-shopping planning
    and adding forgotten items mid-shopping (plan §11).

    Rejected if the list is COMPLETED or CANCELLED.
    """
    shopping_list = _get_list_or_404(list_id, current_user.id, db)
    _assert_list_is_editable(shopping_list)

    suggestion = get_item_suggestion(body.name, db, current_user.id)
    matched_item = match_item_name(body.name, db, current_user.id)

    list_item = ListItem(
        shopping_list_id=shopping_list.id,
        item_id=matched_item.id if matched_item else None,
        name=body.name.strip(),
        quantity=body.quantity or 1.0,
        unit=body.unit or (matched_item.unit if matched_item else None),
        suggested_price=suggestion.get("suggested_price"),
        user_price=body.user_price,
        source=body.source or ListItemSourceEnum.MANUAL,
        shop=body.shop,
    )
    db.add(list_item)
    db.commit()
    db.refresh(list_item)
    _broadcast_list_event(
        current_user,
        "ITEM_ADDED",
        {
            "list_id": list_id,
            "item_id": list_item.id,
            "name": list_item.name,
            "quantity": list_item.quantity,
            "unit": list_item.unit,
        },
    )
    return list_item


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /{list_id}/items/{item_id}/bought — Toggle item bought/unbought
# ─────────────────────────────────────────────────────────────────────────────

@router.patch("/{list_id}/items/{item_id}/bought", response_model=ListItemResponse)
def mark_item_bought(
    list_id: int,
    item_id: int,
    body: MarkBoughtRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_db),
):
    """
    Mark a single list item as bought or unbought (plan §9).
    This does NOT create a transaction — it only records intent.
    """
    _get_list_or_404(list_id, current_user.id, db)
    list_item = _get_list_item_or_404(item_id, list_id, db)

    list_item.is_bought = body.is_bought
    db.commit()
    db.refresh(list_item)
    _broadcast_list_event(
        current_user,
        "ITEM_TOGGLED",
        {"list_id": list_id, "item_id": item_id, "is_bought": body.is_bought},
    )
    return list_item


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /{list_id}/items/{item_id} — Delete an item from a list
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/{list_id}/items/{item_id}", status_code=204)
def delete_list_item(
    list_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_db),
):
    """
    Remove an item from a shopping list.
    """
    shopping_list = _get_list_or_404(list_id, current_user.id, db)
    _assert_list_is_editable(shopping_list)
    list_item = _get_list_item_or_404(item_id, list_id, db)
    db.delete(list_item)
    db.commit()
    _broadcast_list_event(
        current_user,
        "ITEM_DELETED",
        {"list_id": list_id, "item_id": item_id},
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /{list_id}/items/mark-all-bought — Mark all items bought in one call
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{list_id}/items/mark-all-bought", response_model=ShoppingListResponse)
def mark_all_items_bought(
    list_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_db),
):
    """
    Convenience: mark every item in the list as bought (plan §9 — "Mark All Bought").
    Returns the full updated list so the UI can refresh in one call.
    """
    shopping_list = _get_list_or_404(list_id, current_user.id, db)

    for item in shopping_list.items:
        item.is_bought = True

    db.commit()
    db.refresh(shopping_list)
    _broadcast_list_event(current_user, "ALL_BOUGHT", {"list_id": list_id})
    return shopping_list


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /{list_id} — Delete a shopping list
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/{list_id}", status_code=204)
def delete_shopping_list(
    list_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_db),
):
    """
    Delete a shopping list and all its items (cascade).

    Guards (plan §18):
      - A SHOPPING-status list (user is currently at the bazaar) cannot be deleted
        without cancelling it first. This prevents accidental data loss.
    """
    shopping_list = _get_list_or_404(list_id, current_user.id, db)

    current_status = shopping_list.status.value if hasattr(shopping_list.status, "value") else shopping_list.status
    if current_status == "SHOPPING":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a list that is currently being shopped. "
                   "Cancel it first via PATCH /{list_id}/status.",
        )

    db.delete(shopping_list)
    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# POST /{list_id}/finalize — Convert bought items into a permanent Transaction
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{list_id}/finalize", response_model=dict)
def finalize_shopping_list(
    list_id: int,
    body: FinalizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_db),
):
    """
    The clean finalize path (plan §13).

    Takes all items marked is_bought=True, creates a permanent Transaction,
    updates the item catalog and price history, then marks the list as COMPLETED.

    Only items with is_bought=True are included in the transaction.
    Items the user didn't buy remain on the list as historical context.

    Returns the created Transaction id and total.
    """
    shopping_list = _get_list_or_404(list_id, current_user.id, db)

    bought_items = [item for item in shopping_list.items if item.is_bought]
    if not bought_items:
        raise HTTPException(
            status_code=400,
            detail="No items are marked as bought. Mark items as bought before finalizing.",
        )

    # Apply any price overrides sent by the frontend
    price_overrides: dict = body.price_overrides or {}

    # ── Calculate total from bought items ─────────────────────────────────────
    def effective_price(item: ListItem) -> float:
        override = price_overrides.get(str(item.id)) or price_overrides.get(item.id)
        if override is not None:
            return float(override)
        return float(item.user_price or item.suggested_price or 0.0)

    total = sum(effective_price(item) for item in bought_items)

    tx_title = (body.title or shopping_list.title).strip()

    tx = Transaction(
        user_id=current_user.id,
        title=tx_title,
        total=total,
        source="Manual",           # originated from a shopping list, not OCR
        status="completed",
        location_id=body.location_id,
    )
    db.add(tx)
    db.flush()

    today = date.today()

    for list_item in bought_items:
        item_price = effective_price(list_item)

        # ── Normalise unit/qty ────────────────────────────────────────────────
        pq         = parse_qty_int(list_item.quantity, list_item.unit)
        unit_price = compute_unit_price(item_price, pq.normalized_qty)

        # ── Match or create catalog item ──────────────────────────────────────
        matched = match_item_name(list_item.name, db, current_user.id)

        if matched:
            if matched.id is None:
                matched.user_id = current_user.id
                db.add(matched)
                db.flush()
        else:
            existing = (
                db.query(Item)
                .filter(Item.user_id == current_user.id, Item.name.ilike(list_item.name.strip()))
                .first()
            )
            if existing:
                matched = existing
            else:
                matched = Item(
                    user_id=current_user.id,
                    name=list_item.name.strip().title(),
                    unit=pq.unit,
                    unit_family=pq.unit_family,
                    price_per_unit=unit_price,
                )
                db.add(matched)
                db.flush()

        if matched and unit_price:
            matched.price_per_unit = unit_price
            if pq.unit_family:
                matched.unit_family = pq.unit_family

        # ── Create TransactionItem ────────────────────────────────────────────
        db.add(TransactionItem(
            transaction_id=tx.id,
            item_id=matched.id if (matched and matched.id) else None,
            name=list_item.name,
            qty=list_item.quantity or pq.normalized_qty,
            price=item_price,
            unit=pq.unit,
            display_qty=pq.display_qty,
            normalized_qty=pq.normalized_qty,
            unit_family=pq.unit_family,
            unit_price=unit_price,
        ))

        # ── Record price history ──────────────────────────────────────────────
        if matched and matched.id and item_price:
            db.add(ItemPriceHistory(
                item_id=matched.id,
                price=item_price,
                unit_price=unit_price,
                unit_family=pq.unit_family,
                recorded_at=today,
            ))

        # ── Record market price history ───────────────────────────────────────
        if body.location_id and matched:
            db.add(MarketPriceHistory(
                item_name=matched.name,
                location_id=body.location_id,
                price=item_price,
                unit=pq.unit,
                recorded_at=today,
            ))

        # ── Update the list_item FK to link back to catalog item ──────────────
        if matched and not list_item.item_id:
            list_item.item_id = matched.id

    # ── Mark the shopping list as COMPLETED ───────────────────────────────────
    shopping_list.status       = ListStatusEnum.COMPLETED
    shopping_list.completed_at = datetime.utcnow()

    db.commit()

    try:
        from ..services.badge_service import evaluate_and_award
        evaluate_and_award(current_user.id, db)
    except Exception:
        pass

    return {
        "success":        True,
        "transaction_id": tx.id,
        "total":          round(total, 2),
        "items_bought":   len(bought_items),
        "list_status":    "COMPLETED",
    }



# ─────────────────────────────────────────────────────────────────────────────
# Private helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_list_or_404(list_id: int, user_id: int, db: Session) -> ShoppingList:
    shopping_list = db.query(ShoppingList).filter(
        ShoppingList.id == list_id,
        ShoppingList.user_id == user_id,
    ).first()
    if not shopping_list:
        raise HTTPException(404, "Shopping list not found")
    return shopping_list


def _get_list_item_or_404(item_id: int, list_id: int, db: Session) -> ListItem:
    list_item = db.query(ListItem).filter(
        ListItem.id == item_id,
        ListItem.shopping_list_id == list_id,
    ).first()
    if not list_item:
        raise HTTPException(404, "List item not found")
    return list_item


def _assert_list_is_editable(shopping_list: ShoppingList) -> None:
    """Raise 400 if the list is in a terminal state and cannot be modified."""
    current_status = (
        shopping_list.status.value
        if hasattr(shopping_list.status, "value")
        else shopping_list.status
    )
    if current_status in ("COMPLETED", "CANCELLED"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot modify a {current_status} shopping list.",
        )
