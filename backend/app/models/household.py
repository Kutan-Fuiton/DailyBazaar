"""
app/models/household.py — Household multi-tenancy and shared expense splitting.
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class Household(Base):
    __tablename__ = "households"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    name       = Column(String(200), nullable=False)
    owner_id   = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())

    owner   = relationship("User", foreign_keys=[owner_id])
    members = relationship("HouseholdMember", back_populates="household", cascade="all, delete-orphan")
    splits  = relationship("ExpenseSplit", back_populates="household", cascade="all, delete-orphan")


class HouseholdMember(Base):
    __tablename__ = "household_members"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    household_id = Column(Integer, ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role         = Column(String(50), default="member")  # "owner" | "member"
    joined_at    = Column(DateTime, server_default=func.now())

    household = relationship("Household", back_populates="members")
    user      = relationship("User")


class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    household_id   = Column(Integer, ForeignKey("households.id", ondelete="CASCADE"), nullable=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount_owed    = Column(Float, nullable=False, default=0.0)
    settled        = Column(Boolean, default=False, nullable=False)
    created_at     = Column(DateTime, server_default=func.now())

    household   = relationship("Household", back_populates="splits")
    transaction = relationship("Transaction")
    user        = relationship("User")
