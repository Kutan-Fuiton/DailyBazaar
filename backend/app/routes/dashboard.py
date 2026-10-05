"""
routes/dashboard.py — Aggregated analytics endpoints.

All endpoints read from the current user's data (filtered by current_user.id).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.deps import get_current_user, get_user_db
from ..core.cache import get_cached_dashboard, set_cached_dashboard
from ..models.user import User
from ..services.analytics_service import (
    get_summary,
    get_weekly_trends,
    get_top_items,
    get_price_map,
    get_personal_inflation_index,
    get_monthly_forecast,
    get_price_alert_details,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/overview")
def dashboard_overview(
    include_details: bool = False,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """
    Consolidated dashboard payload.
    Optimized: Returns summary, price_map, and recent_hauls for fast sub-30ms load.
    Heavy calculations (top_items, inflation, alerts) are computed when include_details=True.
    """
    cached = get_cached_dashboard(current_user.id)
    if cached is not None and isinstance(cached, dict) and "summary" in cached:
        return {"success": True, "data": cached}

    from ..models.transaction import Transaction
    recent_txs = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.created_at.desc())
        .limit(5)
        .all()
    )
    serialized_txs = [
        {
            "id": tx.id,
            "title": tx.title,
            "total": tx.total,
            "source": tx.source,
            "status": tx.status,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
            "location_id": tx.location_id,
            "items": [
                {
                    "id": ti.id,
                    "name": ti.name,
                    "qty": ti.qty,
                    "price": ti.price,
                    "unit": ti.unit,
                    "item_id": ti.item_id,
                }
                for ti in tx.items
            ],
        }
        for tx in recent_txs
    ]

    overview_data = {
        "summary": get_summary(db, user=current_user),
        "price_map": get_price_map(db, user_id=current_user.id),
        "recent_hauls": serialized_txs,
        "top_items": get_top_items(db, user_id=current_user.id, limit=10 if include_details else 5),
        "inflation": get_personal_inflation_index(db, user_id=current_user.id) if include_details else [],
        "alerts": get_price_alert_details(db, user_id=current_user.id) if include_details else {"total_alerts": 0, "alerts": []},
    }

    set_cached_dashboard(current_user.id, overview_data)
    return {"success": True, "data": overview_data}


@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Main stats for the HomePage hero card: total damage, alerts, avg daily, etc."""
    cached = get_cached_dashboard(current_user.id)
    if cached is not None:
        if isinstance(cached, dict) and "summary" in cached:
            return {"success": True, "data": cached["summary"]}
        return {"success": True, "data": cached}
    data = get_summary(db, user=current_user)
    return {"success": True, "data": data}


@router.get("/trends")
def spending_trends(
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Last 7 days of daily spending for current user — powers the bar chart."""
    return {"success": True, "data": get_weekly_trends(db, user_id=current_user.id)}


@router.get("/top-items")
def top_items(
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Most frequently bought items by current user — powers Frequent Items carousel."""
    cached = get_cached_dashboard(current_user.id)
    if cached is not None and isinstance(cached, dict) and "top_items" in cached and cached["top_items"]:
        return {"success": True, "data": cached["top_items"]}
    return {"success": True, "data": get_top_items(db, user_id=current_user.id)}


@router.get("/price-map")
def price_map(
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Current user's items with price % change + sparkline — powers Price Watch section."""
    cached = get_cached_dashboard(current_user.id)
    if cached is not None and isinstance(cached, dict) and "price_map" in cached and cached["price_map"]:
        return {"success": True, "data": cached["price_map"]}
    return {"success": True, "data": get_price_map(db, user_id=current_user.id)}


@router.get("/forecast")
def budget_forecast(
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Monthly projected spend and pace based on current run rate."""
    return {"success": True, "data": get_monthly_forecast(db, user_id=current_user.id)}


@router.get("/inflation-index")
def personal_inflation(
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Month-over-month personal basket inflation rate."""
    cached = get_cached_dashboard(current_user.id)
    if cached is not None and isinstance(cached, dict) and "inflation" in cached and cached["inflation"]:
        return {"success": True, "data": cached["inflation"]}
    return {"success": True, "data": get_personal_inflation_index(db, user_id=current_user.id)}


@router.get("/price-alerts")
def price_alerts(
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Detailed price spike and drop breakdown for user items."""
    cached = get_cached_dashboard(current_user.id)
    if cached is not None and isinstance(cached, dict) and "alerts" in cached and cached["alerts"]:
        return {"success": True, "data": cached["alerts"]}
    return {"success": True, "data": get_price_alert_details(db, user_id=current_user.id)}

