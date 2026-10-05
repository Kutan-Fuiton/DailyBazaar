"""
routes/transactions.py — Transaction CRUD.

All queries enforce user_id multitenancy.
On every create, auto-writes to ItemPriceHistory for any item that was
matched — this feeds the 30-day trend charts without extra user effort.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from ..core.deps import get_current_user, get_user_db
from ..models.user import User
from ..models.transaction import Transaction, TransactionItem
from ..models.location import MarketPriceHistory
from ..models.item import ItemPriceHistory
from ..schemas.transaction import TransactionCreate, TransactionResponse, TransactionUpdate
from ..services.matching_service import match_item_name
from ..core.cache import invalidate_user_caches

router = APIRouter(prefix="/transactions", tags=["Transactions"])


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if status:
        q = q.filter(Transaction.status == status)
    if search:
        q = q.filter(Transaction.title.ilike(f"%{search}%"))
    return q.order_by(Transaction.created_at.desc()).offset(skip).limit(limit).all()


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", response_model=TransactionResponse, status_code=201)
def create_transaction(
    body: TransactionCreate,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    total = sum(i.qty * i.price for i in body.items)
    tx = Transaction(
        user_id=current_user.id,
        title=body.title,
        total=total,
        source=body.source,
        status=body.status,
        location_id=body.location_id,
    )
    db.add(tx)
    db.flush()  # get tx.id without committing

    today = date.today()
    for item_data in body.items:
        matched = match_item_name(item_data.name, db, user_id=current_user.id)
        if matched and matched.id is None:
            matched.user_id = current_user.id
            db.add(matched)
            db.flush()

        db.add(TransactionItem(
            transaction_id=tx.id,
            item_id=matched.id if (matched and matched.id) else None,
            name=item_data.name,
            qty=item_data.qty,
            price=item_data.price,
            unit=item_data.unit,
        ))

        # Auto-record price history for matched items → feeds trend charts
        if matched and matched.id:
            db.add(ItemPriceHistory(
                item_id=matched.id,
                price=item_data.price,
                recorded_at=today,
            ))

        # Also write to market price history if a location is attached
        if body.location_id:
            db.add(MarketPriceHistory(
                item_name=matched.name if matched else item_data.name,
                location_id=body.location_id,
                price=item_data.price,
                unit=item_data.unit,
                recorded_at=today,
            ))

    db.commit()
    db.refresh(tx)

    from ..core.cache import invalidate_user_cache, invalidate_market_cache
    invalidate_user_cache(current_user.id)
    invalidate_market_cache()

    try:
        from ..services.badge_service import evaluate_and_award
        evaluate_and_award(current_user.id, db)
    except Exception:
        pass

    return tx



# ── Get one ───────────────────────────────────────────────────────────────────

@router.get("/{tx_id}", response_model=TransactionResponse)
def get_transaction(
    tx_id: int,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id,
    ).first()
    if not tx:
        raise HTTPException(404, "Transaction not found")
    return tx


# ── Update (Rename / Location) ───────────────────────────────────────────────

@router.patch("/{tx_id}", response_model=TransactionResponse)
def update_transaction(
    tx_id: int,
    body: TransactionUpdate,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id,
    ).first()
    if not tx:
        raise HTTPException(404, "Transaction not found")

    if body.title is not None and body.title.strip():
        tx.title = body.title.strip()
    if body.location_id is not None:
        tx.location_id = body.location_id

    db.commit()
    db.refresh(tx)
    invalidate_user_caches(current_user.id)
    return tx


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{tx_id}", status_code=204)
def delete_transaction(
    tx_id: int,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id,
    ).first()
    if not tx:
        raise HTTPException(404, "Transaction not found")
    db.delete(tx)
    db.commit()
    from ..core.cache import invalidate_user_cache, invalidate_market_cache
    invalidate_user_cache(current_user.id)
    invalidate_market_cache()
