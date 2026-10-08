"""
models/global_item.py — Master model for the Dedicated Global Item Database.

Independent from individual users' transaction/catalog databases.
Stores canonical grocery, vegetable, pantry, and bazaar item profiles globally.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.sql import func
from ..core.global_item_db import GlobalItemBase


class GlobalItem(GlobalItemBase):
    __tablename__ = "global_items"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    name                = Column(String(200), nullable=False, unique=True, index=True)
    hindi_name          = Column(String(200), nullable=True)
    bengali_name        = Column(String(200), nullable=True)
    category            = Column(String(100), nullable=False, index=True, default="General")
    sub_category        = Column(String(100), nullable=True)
    brand               = Column(String(100), nullable=True, index=True)
    barcode             = Column(String(100), nullable=True, index=True)
    default_unit        = Column(String(50), nullable=False, default="kg")
    unit_family         = Column(String(20), nullable=False, default="mass")  # mass | volume | count
    price_per_unit      = Column(Float, nullable=True)                        # Benchmark / standard market price
    mrp                 = Column(Float, nullable=True)                        # Maximum Retail Price
    typical_price_range = Column(String(100), nullable=True)                 # e.g., "₹40 - ₹55"
    emoji               = Column(String(20), nullable=True, default="🛒")
    description         = Column(Text, nullable=True)
    storage_type        = Column(String(50), nullable=True)                  # room_temp | refrigerated | frozen
    shelf_life          = Column(String(100), nullable=True)                 # e.g., "3-5 days", "6 months"
    aliases             = Column(Text, nullable=True)                        # Comma-separated alternative/bazaar names
    nutrition_notes     = Column(String(300), nullable=True)
    is_seasonal         = Column(Boolean, default=False)
    season              = Column(String(50), nullable=True)
    created_at          = Column(DateTime, server_default=func.now())
    updated_at          = Column(DateTime, server_default=func.now(), onupdate=func.now())
