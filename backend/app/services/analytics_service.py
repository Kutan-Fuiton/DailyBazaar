"""
services/analytics_service.py
All dashboard calculations — summary stats, 7-day daily trends,
top items, and per-item price-change map.

Every function reads exclusively from the user's data (filtering by user_id).
No cross-user data is exposed.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import date, timedelta
from typing import List, Dict, Any, Optional

from ..models.transaction import Transaction, TransactionItem
from ..models.item import Item, ItemPriceHistory
from ..models.scan import Scan


# ── Internal helpers ──────────────────────────────────────────────────────────

def _sum_between(db: Session, user_id: int, start: date, end: date) -> float:
    result = (
        db.query(func.sum(Transaction.total))
        .filter(Transaction.user_id == user_id)
        .filter(func.date(Transaction.created_at) >= start)
        .filter(func.date(Transaction.created_at) <= end)
        .scalar()
    )
    return float(result or 0)


def _most_purchased_item(db: Session, user_id: int) -> Optional[str]:
    row = (
        db.query(TransactionItem.name, func.count(TransactionItem.id).label("n"))
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .filter(Transaction.user_id == user_id)
        .group_by(TransactionItem.name)
        .order_by(desc("n"))
        .first()
    )
    return row.name if row else None


def _avg_daily_spend(db: Session, user_id: int) -> float:
    """Total spend divided by the number of days since the first transaction."""
    first = (
        db.query(func.min(Transaction.created_at))
        .filter(Transaction.user_id == user_id)
        .scalar()
    )
    if not first:
        return 0.0
    total = (
        db.query(func.sum(Transaction.total))
        .filter(Transaction.user_id == user_id)
        .scalar() or 0
    )
    days = max((date.today() - first.date()).days, 1)
    return round(float(total) / days, 2)


def _active_price_alerts(db: Session, user_id: int) -> int:
    """Count items whose latest price is > 10% above their 7-day average."""
    cutoff = date.today() - timedelta(days=7)
    rows = (
        db.query(
            ItemPriceHistory.item_id,
            func.avg(ItemPriceHistory.price).label("avg7"),
            func.max(ItemPriceHistory.price).label("latest"),
        )
        .join(Item, ItemPriceHistory.item_id == Item.id)
        .filter(Item.user_id == user_id)
        .filter(ItemPriceHistory.recorded_at >= cutoff)
        .group_by(ItemPriceHistory.item_id)
        .all()
    )
    return sum(1 for r in rows if r.avg7 and r.latest > r.avg7 * 1.10)


# ── Public API ────────────────────────────────────────────────────────────────

def _count_user_scans(db: Session, user_id: int) -> int:
    """Count OCR scans that belong to the user (via confirmed transactions)."""
    return (
        db.query(func.count(Scan.id))
        .join(Transaction, Scan.transaction_id == Transaction.id)
        .filter(Transaction.user_id == user_id)
        .scalar()
    ) or 0


def get_summary(db: Session, user) -> Dict[str, Any]:
    """
    Returns all stats needed by the HomePage hero card and quick-stats grid for a specific user.

    Notes:
      - savings_potential: returns None until real cross-location price data is available.
        The frontend should hide this field when None rather than show a misleading estimate.
      - best_deal_saved: returns 0.0 until shop-level price comparison is built (Phase 5).
    """
    user_id     = user.id
    today       = date.today()
    week_start  = today - timedelta(days=today.weekday())
    prev_week_start = week_start - timedelta(days=7)
    prev_week_end   = week_start - timedelta(days=1)

    this_week_total = _sum_between(db, user_id, week_start, today)
    last_week_total = _sum_between(db, user_id, prev_week_start, prev_week_end)

    if last_week_total > 0:
        change_pct = round(((this_week_total - last_week_total) / last_week_total) * 100, 1)
    else:
        change_pct = 0.0

    total_all_time = float(
        db.query(func.sum(Transaction.total))
        .filter(Transaction.user_id == user_id)
        .scalar() or 0
    )
    total_items = (
        db.query(func.count(Item.id))
        .filter(Item.user_id == user_id)
        .scalar() or 0
    )
    tx_count = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.user_id == user_id)
        .scalar() or 0
    )

    return {
        "total_damage":            round(total_all_time, 2),
        "total_damage_change_pct": change_pct,
        # None until Phase 5 cross-location price comparison is available.
        # Frontend should hide or show a placeholder when this is None.
        "savings_potential":       None,
        "active_alerts":           _active_price_alerts(db, user_id),
        "total_items":             total_items,
        "most_purchased_item":     _most_purchased_item(db, user_id),
        # Will be computed in Phase 5 when shop-level price comparison exists.
        "best_deal_saved":         0.0,
        "avg_daily_spend":         _avg_daily_spend(db, user_id),
        # Real count from scans table — previously was hardcoded 0.
        "total_scans":             _count_user_scans(db, user_id),
        "total_transactions":      tx_count,
        "member_since":            user.created_at.isoformat() if user and user.created_at else None,
    }


def get_weekly_trends(db: Session, user_id: int) -> List[Dict]:
    """
    Returns spending per day for the last 7 days for the authenticated user.
    """
    today = date.today()
    results = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        total = _sum_between(db, user_id, day, day)
        results.append({
            "day":    day.strftime("%a"),
            "date":   day.isoformat(),
            "amount": round(total, 2),
        })
    return results


def get_top_items(db: Session, user_id: int, limit: int = 10) -> List[Dict]:
    """
    Returns the user's most frequently bought items with weighted average
    unit price per STATISTICAL_MEASURES.md:
      avg_unit_price = Σ(unit_price × normalized_qty) / Σ(normalized_qty)
    Optimized: Batched into 4 queries instead of 1 + 3N sequential network hops.
    """
    from collections import defaultdict

    rows = (
        db.query(
            TransactionItem.name,
            TransactionItem.item_id,
            func.count(TransactionItem.id).label("frequency"),
            func.avg(TransactionItem.price).label("avg_price"),
        )
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .filter(Transaction.user_id == user_id)
        .group_by(TransactionItem.name, TransactionItem.item_id)
        .order_by(desc("frequency"))
        .limit(limit)
        .all()
    )

    if not rows:
        return []

    # 1. Batch fetch Item records
    item_ids = [r.item_id for r in rows if r.item_id]
    item_map: Dict[int, Item] = {}
    if item_ids:
        items = db.query(Item).filter(Item.id.in_(item_ids), Item.user_id == user_id).all()
        item_map = {it.id: it for it in items}

    # 2. Batch fetch latest transaction dates for each item name
    names = [r.name for r in rows]
    last_tx_rows = (
        db.query(
            TransactionItem.name,
            func.max(Transaction.created_at).label("last_bought"),
        )
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .filter(Transaction.user_id == user_id, TransactionItem.name.in_(names))
        .group_by(TransactionItem.name)
        .all()
    )
    last_bought_map = {r[0]: r[1].isoformat() if r[1] else None for r in last_tx_rows}

    # 3. Batch fetch weighted average unit price rows
    wt_by_item = defaultdict(list)
    if item_ids:
        wt_rows = (
            db.query(
                TransactionItem.item_id,
                TransactionItem.unit_price,
                TransactionItem.normalized_qty,
                TransactionItem.unit_family,
            )
            .filter(TransactionItem.item_id.in_(item_ids))
            .filter(TransactionItem.unit_price.isnot(None))
            .filter(TransactionItem.normalized_qty.isnot(None))
            .all()
        )
        for w in wt_rows:
            wt_by_item[w.item_id].append(w)

    results = []
    for r in rows:
        item: Optional[Item] = item_map.get(r.item_id) if r.item_id else None
        last_bought = last_bought_map.get(r.name)

        avg_unit_price: Optional[float] = None
        unit_family: Optional[str] = None
        if r.item_id and r.item_id in wt_by_item:
            wt_item_rows = wt_by_item[r.item_id]
            total_weight = sum(w.normalized_qty for w in wt_item_rows if w.normalized_qty)
            if total_weight > 0:
                weighted_sum = sum((w.unit_price or 0) * (w.normalized_qty or 0) for w in wt_item_rows)
                avg_unit_price = round(weighted_sum / total_weight, 4)
            unit_family = next((w.unit_family for w in reversed(wt_item_rows) if w.unit_family), None)

        results.append({
            "id":             r.item_id,
            "name":           r.name,
            "emoji":          item.emoji if item else "🛒",
            "price":          round(float(r.avg_price or 0), 2),
            "avg_unit_price": avg_unit_price,
            "unit_family":    unit_family or (item.unit_family if item else None),
            "last_bought":    last_bought,
            "tag":            item.tag if item else "Frequent",
            "purchase_count": r.frequency,
        })
    return results



def get_price_map(db: Session, user_id: int) -> List[Dict]:
    """
    Returns tracked items with their % price change and a 7-day sparkline.
    Optimized: Batches price history in a single SQL query instead of N+1 roundtrips.
    """
    from collections import defaultdict
    items = db.query(Item).filter(Item.user_id == user_id).all()
    if not items:
        return []

    item_map = {item.id: item for item in items}
    item_ids = list(item_map.keys())

    # Fetch all histories for user's items in a single query
    histories = (
        db.query(ItemPriceHistory)
        .filter(ItemPriceHistory.item_id.in_(item_ids))
        .order_by(ItemPriceHistory.item_id, ItemPriceHistory.recorded_at.asc())
        .all()
    )

    history_by_item = defaultdict(list)
    for h in histories:
        history_by_item[h.item_id].append(h)

    results = []
    for item_id, history in history_by_item.items():
        if len(history) < 2:
            continue

        item = item_map.get(item_id)
        if not item:
            continue

        prices = [h.price for h in history[-7:]]
        oldest = prices[0]
        newest = prices[-1]
        if oldest == 0:
            continue
        change_pct = round(((newest - oldest) / oldest) * 100, 1)

        results.append({
            "id":            item.id,
            "name":          item.name,
            "emoji":         item.emoji or "🛒",
            "change_pct":    change_pct,
            "description":   _price_change_label(change_pct),
            "price_history": prices,
        })

    results.sort(key=lambda x: abs(x["change_pct"]), reverse=True)
    return results[:10]


def _price_change_label(pct: float) -> str:
    if pct <= -10:
        return "Market average dropping"
    if pct < 0:
        return "Slight price decrease"
    if pct == 0:
        return "Stable price"
    if pct < 10:
        return "Slight price increase"
    return "Price rising — consider stockpiling"


def get_spending_dna(db: Session, user_id: int) -> List[Dict]:
    """
    Returns spending % broken down by item category for the user.
    """
    rows = (
        db.query(
            Item.category,
            func.sum(TransactionItem.qty * TransactionItem.price).label("total"),
        )
        .join(TransactionItem, TransactionItem.item_id == Item.id)
        .filter(Item.user_id == user_id)
        .group_by(Item.category)
        .all()
    )

    unmatched_total = (
        db.query(func.sum(TransactionItem.qty * TransactionItem.price))
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .filter(Transaction.user_id == user_id)
        .filter(TransactionItem.item_id.is_(None))
        .scalar()
    ) or 0

    category_totals: Dict[str, float] = {}
    for r in rows:
        label = r.category or "Other"
        category_totals[label] = category_totals.get(label, 0) + float(r.total or 0)

    if unmatched_total > 0:
        category_totals["Other"] = category_totals.get("Other", 0) + float(unmatched_total)

    grand_total = sum(category_totals.values())
    if grand_total == 0:
        return []

    COLORS = ["#c3f400", "#00dce5", "#ffb86f", "#ffb4ab", "#abd600", "#00f4fe"]
    return [
        {
            "label": cat,
            "pct":   round((total / grand_total) * 100, 1),
            "color": COLORS[i % len(COLORS)],
        }
        for i, (cat, total) in enumerate(
            sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
        )
    ]


def get_personal_inflation_index(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """
    Computes personal month-over-month inflation index.
    Calculates the average basket/transaction spend per month and the percentage change.
    """
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id, Transaction.status == "completed")
        .order_by(Transaction.created_at.asc())
        .all()
    )
    if not transactions:
        return []

    month_buckets: Dict[str, List[float]] = {}
    for tx in transactions:
        if tx.created_at:
            m_key = tx.created_at.strftime("%Y-%m")
            if m_key not in month_buckets:
                month_buckets[m_key] = []
            month_buckets[m_key].append(float(tx.total or 0.0))

    sorted_months = sorted(month_buckets.keys())
    # Keep last 6 months
    sorted_months = sorted_months[-6:]

    result = []
    prev_avg = None

    for m in sorted_months:
        totals = month_buckets[m]
        avg_cost = sum(totals) / len(totals) if totals else 0.0
        if prev_avg is not None and prev_avg > 0:
            change_pct = round(((avg_cost - prev_avg) / prev_avg) * 100.0, 1)
        else:
            change_pct = 0.0

        result.append({
            "month": m,
            "avg_basket_cost": round(avg_cost, 2),
            "total_spend": round(sum(totals), 2),
            "transaction_count": len(totals),
            "change_pct": change_pct
        })
        prev_avg = avg_cost

    return result


def get_monthly_forecast(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Extrapolates month-end grocery spending based on run rate so far this month.
    """
    import calendar
    today = date.today()
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    days_elapsed = max(1, today.day)
    remaining_days = max(0, days_in_month - days_elapsed)

    month_start = date(today.year, today.month, 1)
    current_month_spend = _sum_between(db, user_id, month_start, today)

    # Previous month spend for comparison
    if today.month == 1:
        prev_month_start = date(today.year - 1, 12, 1)
        prev_month_end = date(today.year - 1, 12, 31)
    else:
        prev_month_days = calendar.monthrange(today.year, today.month - 1)[1]
        prev_month_start = date(today.year, today.month - 1, 1)
        prev_month_end = date(today.year, today.month - 1, prev_month_days)

    prev_month_spend = _sum_between(db, user_id, prev_month_start, prev_month_end)

    avg_daily = round(current_month_spend / days_elapsed, 2)
    projected_total = round(current_month_spend + (avg_daily * remaining_days), 2)

    if prev_month_spend > 0:
        pace_pct = round(((projected_total - prev_month_spend) / prev_month_spend) * 100.0, 1)
    else:
        pace_pct = 0.0

    return {
        "days_elapsed": days_elapsed,
        "days_in_month": days_in_month,
        "remaining_days": remaining_days,
        "current_total": round(current_month_spend, 2),
        "projected_total": projected_total,
        "avg_daily": avg_daily,
        "previous_month_total": round(prev_month_spend, 2),
        "pace_pct": pace_pct,
        "status": "on_pace" if abs(pace_pct) <= 5 else ("higher" if pace_pct > 0 else "lower")
    }


def get_price_alert_details(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Returns item-level alert objects for price spikes (>10% above avg) and price drops (<10% below avg).
    Optimized: Batched into 2 queries instead of 1 + N sequential queries.
    """
    from collections import defaultdict

    cutoff = date.today() - timedelta(days=30)
    items = db.query(Item).filter(Item.user_id == user_id).all()
    if not items:
        return {
            "spike_count": 0,
            "drop_count": 0,
            "total_alerts": 0,
            "alerts": []
        }

    item_ids = [item.id for item in items]
    histories = (
        db.query(ItemPriceHistory)
        .filter(ItemPriceHistory.item_id.in_(item_ids), ItemPriceHistory.recorded_at >= cutoff)
        .order_by(ItemPriceHistory.item_id, ItemPriceHistory.recorded_at.desc())
        .all()
    )

    histories_by_item = defaultdict(list)
    for h in histories:
        histories_by_item[h.item_id].append(h)

    alerts = []
    spike_count = 0
    drop_count = 0

    for item in items:
        h_list = histories_by_item.get(item.id, [])
        if len(h_list) < 2:
            continue

        prices = [h.unit_price if (h.unit_price and h.unit_price > 0) else h.price for h in h_list]
        latest_price = prices[0]
        historical_prices = prices[1:]
        avg_price = sum(historical_prices) / len(historical_prices) if historical_prices else latest_price

        if avg_price <= 0:
            continue

        pct_diff = round(((latest_price - avg_price) / avg_price) * 100.0, 1)

        if pct_diff >= 10.0:
            spike_count += 1
            alerts.append({
                "item_id": item.id,
                "item_name": item.name,
                "emoji": item.emoji or "🏷️",
                "alert_type": "spike",
                "pct_diff": pct_diff,
                "current_price": round(latest_price, 2),
                "avg_price": round(avg_price, 2),
                "message": f"{item.name} is {pct_diff:.1f}% more expensive than recent purchases."
            })
        elif pct_diff <= -10.0:
            drop_count += 1
            alerts.append({
                "item_id": item.id,
                "item_name": item.name,
                "emoji": item.emoji or "🏷️",
                "alert_type": "drop",
                "pct_diff": pct_diff,
                "current_price": round(latest_price, 2),
                "avg_price": round(avg_price, 2),
                "message": f"Great deal! {item.name} dropped by {abs(pct_diff):.1f}%."
            })

    alerts.sort(key=lambda a: abs(a["pct_diff"]), reverse=True)

    return {
        "spike_count": spike_count,
        "drop_count": drop_count,
        "total_alerts": len(alerts),
        "alerts": alerts
    }

