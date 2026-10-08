"""
schemas/global_item.py — Pydantic request/response schemas for the Dedicated Global Item DB.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class GlobalItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Canonical item name")
    hindi_name: Optional[str] = Field(None, max_length=200)
    bengali_name: Optional[str] = Field(None, max_length=200)
    category: str = Field("General", max_length=100)
    sub_category: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    default_unit: str = Field("kg", max_length=50)
    unit_family: str = Field("mass", max_length=20)
    price_per_unit: Optional[float] = Field(None, ge=0)
    mrp: Optional[float] = Field(None, ge=0)
    typical_price_range: Optional[str] = Field(None, max_length=100)
    emoji: Optional[str] = Field("🛒", max_length=20)
    description: Optional[str] = None
    storage_type: Optional[str] = Field(None, max_length=50)
    shelf_life: Optional[str] = Field(None, max_length=100)
    aliases: Optional[str] = None
    nutrition_notes: Optional[str] = Field(None, max_length=300)
    is_seasonal: bool = False
    season: Optional[str] = Field(None, max_length=50)


class GlobalItemCreate(GlobalItemBase):
    pass


class GlobalItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    hindi_name: Optional[str] = None
    bengali_name: Optional[str] = None
    category: Optional[str] = None
    sub_category: Optional[str] = None
    brand: Optional[str] = None
    barcode: Optional[str] = None
    default_unit: Optional[str] = None
    unit_family: Optional[str] = None
    price_per_unit: Optional[float] = None
    mrp: Optional[float] = None
    typical_price_range: Optional[str] = None
    emoji: Optional[str] = None
    description: Optional[str] = None
    storage_type: Optional[str] = None
    shelf_life: Optional[str] = None
    aliases: Optional[str] = None
    nutrition_notes: Optional[str] = None
    is_seasonal: Optional[bool] = None
    season: Optional[str] = None


class GlobalItemResponse(GlobalItemBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class GlobalItemBulkCreate(BaseModel):
    items: List[GlobalItemCreate]


class GlobalItemListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[GlobalItemResponse]
