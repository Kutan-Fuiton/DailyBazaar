from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Date, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class Item(Base):
    __tablename__ = "items"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    user_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name           = Column(String(200), nullable=False, index=True)
    emoji          = Column(String(10), nullable=True)
    category       = Column(String(100), nullable=True)
    unit           = Column(String(50), nullable=True)
    unit_family    = Column(String(20), nullable=True)    # mass | volume | count
    price_per_unit = Column(Float, nullable=True)         # latest known per-unit price
    description    = Column(String(300), nullable=True)
    tag            = Column(String(100), nullable=True)   # e.g. "Essential", "Frequent"
    created_at     = Column(DateTime, server_default=func.now())

    user             = relationship("User",              back_populates="items")
    aliases          = relationship("ItemAlias",        back_populates="item", cascade="all, delete-orphan")
    price_history    = relationship("ItemPriceHistory", back_populates="item", cascade="all, delete-orphan")
    transaction_items = relationship("TransactionItem", back_populates="item")


class ItemAlias(Base):
    __tablename__ = "item_aliases"

    id      = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    alias   = Column(String(200), nullable=False, index=True)

    item = relationship("Item", back_populates="aliases")


class ItemPriceHistory(Base):
    """Records the price of a tracked item each time it appears in a transaction.
    Feeds the 30-day trend chart on the item detail page.
    """
    __tablename__ = "item_price_history"
    __table_args__ = (
        Index("ix_item_price_history_item_recorded", "item_id", "recorded_at"),
    )

    id          = Column(Integer, primary_key=True, autoincrement=True)
    item_id     = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    price       = Column(Float, nullable=False)            # total line price
    unit_price  = Column(Float, nullable=True)             # price ÷ normalized_qty
    unit_family = Column(String(20), nullable=True)        # mass | volume | count
    recorded_at = Column(Date, nullable=False)

    item = relationship("Item", back_populates="price_history")
