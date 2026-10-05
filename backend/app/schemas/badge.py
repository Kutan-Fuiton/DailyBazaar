"""
app/schemas/badge.py — Gamification badges schemas.
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class BadgeInfo(BaseModel):
    badge_key: str
    name: str
    description: str
    icon: str
    category: str
    earned: bool
    earned_at: Optional[datetime] = None


class UserBadgesResponse(BaseModel):
    badges: List[BadgeInfo]
    earned_count: int
    total_count: int
    current_streak_days: int = 0
