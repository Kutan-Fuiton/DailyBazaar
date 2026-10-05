"""
routes/profile.py — User profile analytics.

GET /users/me/stats — returns spending DNA + active price alert count for current user.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.deps import get_current_user, get_user_db
from ..models.user import User
from ..services.analytics_service import get_spending_dna, _active_price_alerts

router = APIRouter(prefix="/users", tags=["Profile"])


@router.get("/me/stats")
def profile_stats(
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns:
      - spending_dna: list of {label, pct, color} by category for current_user
      - price_alerts_active: int count of items with rising prices for current_user
    """
    return {
        "spending_dna":         get_spending_dna(db, user_id=current_user.id),
        "price_alerts_active":  _active_price_alerts(db, user_id=current_user.id),
        "share_pricing_data":   bool(current_user.share_pricing_data),
    }


@router.patch("/me/share-pricing")
def update_share_pricing(
    req: dict,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    share = bool(req.get("share", False))
    current_user.share_pricing_data = share
    db.commit()
    db.refresh(current_user)
    return {"share_pricing_data": current_user.share_pricing_data}

