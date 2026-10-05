from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base
import enum


class SourceEnum(str, enum.Enum):
    OCR = "OCR"
    Manual = "Manual"


class StatusEnum(str, enum.Enum):
    completed = "completed"
    pending = "pending"


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_user_created", "user_id", "created_at"),
    )

    id          = Column(Integer, primary_key=True, autoincrement=True)
    user_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title       = Column(String(300), nullable=False)
    total       = Column(Float, default=0.0)
    source      = Column(Enum(SourceEnum), default=SourceEnum.Manual)
    status      = Column(Enum(StatusEnum), default=StatusEnum.completed)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="SET NULL"), nullable=True)
    created_at  = Column(DateTime, server_default=func.now())

    user     = relationship("User", back_populates="transactions")
    items    = relationship("TransactionItem", back_populates="transaction", cascade="all, delete-orphan")
    location = relationship("Location", back_populates="transactions")


class TransactionItem(Base):
    __tablename__ = "transaction_items"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    item_id        = Column(Integer, ForeignKey("items.id", ondelete="SET NULL"), nullable=True)
    name           = Column(String(200), nullable=False)
    qty            = Column(Float, default=1.0)           # raw OCR numeric qty (backward compat)
    price          = Column(Float, default=0.0)           # total price for this line
    unit           = Column(String(50), nullable=True)    # canonical unit: kg | L | piece

    # ── Statistical normalisation (STATISTICAL_MEASURES.md) ──────────────────
    display_qty    = Column(String(50), nullable=True)    # human-readable raw string, e.g. "500g"
    normalized_qty = Column(Float, nullable=True)         # normalised qty in canonical unit
    unit_family    = Column(String(20), nullable=True)    # mass | volume | count
    unit_price     = Column(Float, nullable=True)         # price ÷ normalized_qty (Rs/kg, Rs/L, Rs/piece)

    transaction = relationship("Transaction", back_populates="items")
    item        = relationship("Item", back_populates="transaction_items")

