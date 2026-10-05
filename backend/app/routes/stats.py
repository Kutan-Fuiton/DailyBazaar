"""
routes/stats.py — Detailed Statistics & Item Intelligence API.

Endpoints:
- GET /stats/overview — 6-month monthly spending trend & top 10 most common items
- GET /stats/search   — Unified item search across Global Lexicon and Personal History
- GET /stats/item/{item_id} — Comprehensive item detail with 30-day price trend & location comparisons
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, timedelta
from pydantic import BaseModel

from ..core.deps import get_current_user, get_user_db
from ..models.user import User
from ..models.transaction import Transaction, TransactionItem
from ..models.item import Item, ItemPriceHistory
from ..models.lexicon import LexiconEntry, LexiconAlias
from ..models.location import Location, MarketPriceHistory

router = APIRouter(prefix="/stats", tags=["Statistics"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class MonthlySpendingPoint(BaseModel):
    month_key: str     # "2026-04"
    label: str         # "Apr 2026"
    total: float
    transactions_count: int


class TopItemStat(BaseModel):
    id: Optional[int]
    name: str
    emoji: Optional[str] = "🥬"
    category: Optional[str] = "General"
    purchase_count: int
    total_spent: float
    avg_price: float
    unit: Optional[str] = "kg"


class StatsOverviewResponse(BaseModel):
    monthly_spending: List[MonthlySpendingPoint]
    top_items: List[TopItemStat]
    total_spent_all_time: float
    total_transactions_count: int
    total_unique_items: int


class SearchItemResult(BaseModel):
    id: Optional[int]
    name: str
    bengali_name: Optional[str] = None
    hindi_name: Optional[str] = None
    category: Optional[str] = "Groceries"
    emoji: Optional[str] = "🥬"
    unit: Optional[str] = "kg"
    avg_price: Optional[float] = None
    purchase_count: int = 0
    source: str  # "personal" | "global"
    sparkline: List[float] = []


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/overview", response_model=StatsOverviewResponse)
def get_stats_overview(
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns monthly spending for the last 6 calendar months and top 10 items by frequency.
    """
    # 1. Total all-time spend & transactions
    all_txs = (
        db.query(Transaction.total)
        .filter(Transaction.user_id == current_user.id)
        .all()
    )
    total_all_time = round(sum(t.total or 0 for t in all_txs), 2)
    tx_count = len(all_txs)

    unique_items_count = (
        db.query(func.count(Item.id))
        .filter(Item.user_id == current_user.id)
        .scalar() or 0
    )

    # 2. Monthly spending (last 6 months) — single query batch
    today = date.today()
    # Calculate cutoff 5 months back from start of month
    m_earliest = today.month - 5
    y_earliest = today.year
    while m_earliest <= 0:
        m_earliest += 12
        y_earliest -= 1
    six_months_start = date(y_earliest, m_earliest, 1)

    all_recent_txs = (
        db.query(Transaction.total, Transaction.created_at)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.created_at >= six_months_start,
        )
        .all()
    )

    monthly_points: List[MonthlySpendingPoint] = []
    for m_back in range(5, -1, -1):
        year = today.year
        month = today.month - m_back
        while month <= 0:
            month += 12
            year -= 1

        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1)
        else:
            month_end = date(year, month + 1, 1)

        month_label = month_start.strftime("%b %Y")
        month_key = month_start.strftime("%Y-%m")

        # Filter in memory
        matching_totals = [
            t.total or 0 for t in all_recent_txs
            if t.created_at and month_start <= t.created_at.date() < month_end
        ]

        monthly_points.append(
            MonthlySpendingPoint(
                month_key=month_key,
                label=month_label,
                total=round(sum(matching_totals), 2),
                transactions_count=len(matching_totals),
            )
        )

    # 3. Top 10 items by purchase count — batched item metadata query
    top_rows = (
        db.query(
            TransactionItem.name,
            func.count(TransactionItem.id).label("cnt"),
            func.sum(TransactionItem.price).label("spent"),
            func.avg(TransactionItem.price).label("avg_pr"),
            TransactionItem.item_id,
            TransactionItem.unit,
        )
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .filter(Transaction.user_id == current_user.id)
        .group_by(TransactionItem.name, TransactionItem.item_id, TransactionItem.unit)
        .order_by(func.count(TransactionItem.id).desc())
        .limit(10)
        .all()
    )

    item_ids = [r.item_id for r in top_rows if r.item_id]
    item_map = {}
    if item_ids:
        items = db.query(Item).filter(Item.id.in_(item_ids)).all()
        item_map = {it.id: it for it in items}

    top_items: List[TopItemStat] = []
    for r in top_rows:
        emoji = "🥬"
        category = "General"
        if r.item_id and r.item_id in item_map:
            it = item_map[r.item_id]
            emoji = it.emoji or "🥬"
            category = it.category or "General"

        top_items.append(
            TopItemStat(
                id=r.item_id,
                name=r.name,
                emoji=emoji,
                category=category,
                purchase_count=int(r.cnt),
                total_spent=round(float(r.spent or 0), 2),
                avg_price=round(float(r.avg_pr or 0), 2),
                unit=r.unit or "kg",
            )
        )

    return StatsOverviewResponse(
        monthly_spending=monthly_points,
        top_items=top_items,
        total_spent_all_time=total_all_time,
        total_transactions_count=tx_count,
        total_unique_items=unique_items_count,
    )


@router.get("/search", response_model=List[SearchItemResult])
def search_stats_items(
    q: Optional[str] = Query("", min_length=0),
    scope: str = Query("all", regex="^(all|personal|global)$"),
    limit: int = Query(25, ge=1, le=50),
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search items with purchase stats, average price, and mini sparkline history.
    """
    results: List[SearchItemResult] = []
    term = q.strip().lower() if q else ""
    seen_names = set()

    # ── 1. Personal Items ─────────────────────────────────────────────────────
    if scope in ("all", "personal"):
        item_q = db.query(Item).filter(Item.user_id == current_user.id)
        if term:
            item_q = item_q.filter(Item.name.ilike(f"%{term}%"))

        personal_items = item_q.order_by(Item.name).limit(limit).all()

        for it in personal_items:
            norm_name = it.name.strip().lower()
            if norm_name in seen_names:
                continue
            seen_names.add(norm_name)

            # Purchase count & total
            p_count = (
                db.query(func.count(TransactionItem.id))
                .filter(TransactionItem.item_id == it.id)
                .scalar() or 0
            )

            # Sparkline prices (last 6 records)
            hist_rows = (
                db.query(ItemPriceHistory.price)
                .filter(ItemPriceHistory.item_id == it.id)
                .order_by(ItemPriceHistory.recorded_at.asc())
                .limit(6)
                .all()
            )
            sparkline = [round(float(h.price), 2) for h in hist_rows if h.price]

            results.append(
                SearchItemResult(
                    id=it.id,
                    name=it.name,
                    category=it.category or "My Items",
                    emoji=it.emoji or "🥬",
                    unit=it.unit or "kg",
                    avg_price=float(it.price_per_unit) if it.price_per_unit else (sparkline[-1] if sparkline else None),
                    purchase_count=p_count,
                    source="personal",
                    sparkline=sparkline,
                )
            )

    # ── 2. Global Lexicon Items ───────────────────────────────────────────────
    if scope in ("all", "global") and len(results) < limit:
        remaining = limit - len(results)
        lex_q = db.query(LexiconEntry)
        if term:
            lex_q = lex_q.filter(
                (LexiconEntry.canonical_name.ilike(f"%{term}%")) |
                (LexiconEntry.bengali_name.ilike(f"%{term}%")) |
                (LexiconEntry.hindi_name.ilike(f"%{term}%"))
            )
        lex_entries = lex_q.order_by(LexiconEntry.canonical_name).limit(remaining).all()

        for le in lex_entries:
            if le.canonical_name.lower() not in seen_names:
                seen_names.add(le.canonical_name.lower())
                avg_p = float(le.avg_price_kg) if le.avg_price_kg else None
                # If there's an avg price, synthesize a small steady sparkline
                sparkline = [avg_p * 0.96, avg_p * 1.02, avg_p] if avg_p else []
                results.append(
                    SearchItemResult(
                        id=le.id,
                        name=le.canonical_name,
                        bengali_name=le.bengali_name,
                        hindi_name=le.hindi_name,
                        category=le.category or "Market Items",
                        emoji=le.emoji or "🥬",
                        unit=le.default_unit or "kg",
                        avg_price=avg_p,
                        purchase_count=0,
                        source="global",
                        sparkline=sparkline,
                    )
                )

    return results


@router.get("/item/{item_id}")
def get_item_full_stats(
    item_id: int,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns full stats for an item: 30-day price trend, location comparisons, and cadence.
    """
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.user_id == current_user.id,
    ).first()

    if not item:
        # Check if it's a global Lexicon item
        lex = db.query(LexiconEntry).filter(LexiconEntry.id == item_id).first()
        if not lex:
            raise HTTPException(404, "Item not found")

        # Market prices for this global item across locations
        market_rows = (
            db.query(MarketPriceHistory.price, MarketPriceHistory.location_id, Location.name)
            .outerjoin(Location, MarketPriceHistory.location_id == Location.id)
            .filter(MarketPriceHistory.item_name.ilike(lex.canonical_name))
            .limit(10)
            .all()
        )

        return {
            "id": lex.id,
            "name": lex.canonical_name,
            "bengali_name": lex.bengali_name,
            "hindi_name": lex.hindi_name,
            "category": lex.category or "Groceries",
            "emoji": lex.emoji or "🥬",
            "unit": lex.default_unit or "kg",
            "avg_price": lex.avg_price_kg,
            "is_global": True,
            "price_history": [
                {"date": str(date.today() - timedelta(days=14)), "price": round(lex.avg_price_kg * 0.95, 2) if lex.avg_price_kg else 0},
                {"date": str(date.today() - timedelta(days=7)), "price": round(lex.avg_price_kg * 1.02, 2) if lex.avg_price_kg else 0},
                {"date": str(date.today()), "price": round(lex.avg_price_kg, 2) if lex.avg_price_kg else 0},
            ] if lex.avg_price_kg else [],
            "locations": [
                {"location": r.name or "Local Bazaar", "price": round(float(r.price), 2)}
                for r in market_rows if r.price
            ],
            "purchase_count": 0,
            "total_spent": 0,
        }

    # Personal item details
    cutoff = date.today() - timedelta(days=30)
    history_rows = (
        db.query(
            ItemPriceHistory.recorded_at,
            func.avg(ItemPriceHistory.price).label("avg_price")
        )
        .filter(ItemPriceHistory.item_id == item.id, ItemPriceHistory.recorded_at >= cutoff)
        .group_by(ItemPriceHistory.recorded_at)
        .order_by(ItemPriceHistory.recorded_at.asc())
        .all()
    )

    p_history = [
        {"date": str(r.recorded_at), "price": round(float(r.avg_price or 0), 2)}
        for r in history_rows
    ]

    p_count = (
        db.query(func.count(TransactionItem.id))
        .filter(TransactionItem.item_id == item.id)
        .scalar() or 0
    )

    t_spent = (
        db.query(func.sum(TransactionItem.price))
        .filter(TransactionItem.item_id == item.id)
        .scalar() or 0
    )

    # Location comparison
    loc_rows = (
        db.query(
            Location.name.label("loc_name"),
            func.avg(TransactionItem.price).label("avg_loc_price"),
        )
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .join(Location, Transaction.location_id == Location.id)
        .filter(TransactionItem.item_id == item.id)
        .group_by(Location.name)
        .all()
    )

    return {
        "id": item.id,
        "name": item.name,
        "category": item.category or "My Items",
        "emoji": item.emoji or "🥬",
        "unit": item.unit or "kg",
        "avg_price": item.price_per_unit,
        "is_global": False,
        "price_history": p_history,
        "locations": [
            {"location": r.loc_name or "Unknown", "price": round(float(r.avg_loc_price or 0), 2)}
            for r in loc_rows
        ],
        "purchase_count": p_count,
        "total_spent": round(float(t_spent), 2),
    }
