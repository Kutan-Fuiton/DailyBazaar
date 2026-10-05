from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class Location(Base):
    __tablename__ = "locations"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name       = Column(String(200), nullable=False)       # "Barasat Bazar"
    city       = Column(String(100), nullable=True)
    address    = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user          = relationship("User", back_populates="locations")
    transactions  = relationship("Transaction", back_populates="location")
    price_history = relationship("MarketPriceHistory", back_populates="location", cascade="all, delete-orphan")


class MarketPriceHistory(Base):
    """Tracks what each item cost at a specific location on a specific date.
    Populated automatically when a transaction with a location is confirmed.
    Used for cross-location price analytics.
    """
    __tablename__ = "market_price_history"
    __table_args__ = (
        Index("ix_market_price_history_item_recorded", "item_name", "recorded_at"),
    )

    id          = Column(Integer, primary_key=True, autoincrement=True)
    item_name   = Column(String(200), nullable=False, index=True)   # canonical name
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False)
    price       = Column(Float, nullable=False)
    unit        = Column(String(50), nullable=True)
    recorded_at = Column(Date, nullable=False)       # date of purchase

    location = relationship("Location", back_populates="price_history")
