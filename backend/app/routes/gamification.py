"""
app/routes/gamification.py — Gamification badges, streaks, and milestone achievements.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.deps import get_current_user, get_user_db
from ..models.user import User
from ..schemas.badge import UserBadgesResponse
from ..services import badge_service

router = APIRouter(prefix="/gamification", tags=["Gamification"])


@router.get("/badges", response_model=UserBadgesResponse)
def get_user_badges(
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the user's earned and unearned badges, progress, and current shopping streak.
    """
    return badge_service.get_user_badges(user_id=current_user.id, db=db)
