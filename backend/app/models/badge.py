"""
app/models/badge.py — User gamification badges and streaks.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class UserBadge(Base):
    __tablename__ = "user_badges"

    id        = Column(Integer, primary_key=True, autoincrement=True)
    user_id   = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_key = Column(String(100), nullable=False, index=True)
    earned_at = Column(DateTime, server_default=func.now())

    user = relationship("User")
