from pydantic import BaseModel, field_validator
from datetime import datetime, date
from typing import Optional, List
from ..core.sanitizer import sanitize_string


class AliasCreate(BaseModel):
    alias: str

    @field_validator("alias")
    @classmethod
    def sanitize_alias(cls, v: str) -> str:
        return sanitize_string(v) or ""


class AliasResponse(BaseModel):
    id: int
    alias: str
    model_config = {"from_attributes": True}


class ItemCreate(BaseModel):
    name: str
    emoji: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    price_per_unit: Optional[float] = None
    description: Optional[str] = None
    tag: Optional[str] = None

    @field_validator("name", "description", "category", "tag", "unit")
    @classmethod
    def sanitize_fields(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class ItemResponse(BaseModel):
    id: int
    name: str
    emoji: Optional[str]
    category: Optional[str]
    unit: Optional[str]
    price_per_unit: Optional[float]
    description: Optional[str]
    tag: Optional[str]
    created_at: datetime
    aliases: List[AliasResponse] = []
    model_config = {"from_attributes": True}


class PriceHistoryEntry(BaseModel):
    """One data point for the item's 30-day price trend chart."""
    date: str
    price: float


# ── Intelligence schemas ───────────────────────────────────────────────────────

class PriceStats(BaseModel):
    current_price: float
    avg_price: float
    min_price: float
    max_price: float
    min_date: Optional[str]
    max_date: Optional[str]
    inflation_pct: float


class VendorEntry(BaseModel):
    vendor: str
    price: float
    purchase_count: int


class CadenceInfo(BaseModel):
    avg_cadence_days: Optional[int]
    days_since_last: Optional[int]
    last_purchase_date: Optional[str]


class ItemDetailsResponse(BaseModel):
    item: ItemResponse
    price_history: List[dict]
    stats: PriceStats
    vendor_comparison: List[VendorEntry]
    cadence: CadenceInfo
    purchase_count: int
    total_spent: float
    model_config = {"from_attributes": True}


class AIInsightsResponse(BaseModel):
    market_timing: str
    storage_tip: str
    smart_buy: str
