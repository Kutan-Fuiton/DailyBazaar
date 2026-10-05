"""
app/schemas/intelligence.py — Pydantic schemas for market intelligence, forecasting, and restock.
"""
from pydantic import BaseModel
from typing import Optional, List


class MarketComparisonResponse(BaseModel):
    item_id: int
    user_avg_price: Optional[float] = None
    market_avg_price: Optional[float] = None
    percentile: Optional[float] = None
    location_id: Optional[int] = None
    sample_size: int = 0
    savings_pct: Optional[float] = None
    status: str = "ok"


class PriceForecastResponse(BaseModel):
    item_id: int
    current_price: Optional[float] = None
    trend: str  # "rising" | "falling" | "stable"
    best_buy_window: str
    confidence: float
    projected_price_7d: Optional[float] = None


class RestockItem(BaseModel):
    item_id: int
    item_name: str
    emoji: Optional[str] = None
    category: Optional[str] = None
    avg_interval_days: float
    days_since_last_purchase: int
    urgency: str  # "due" | "upcoming" | "stocked"
    last_purchased_at: Optional[str] = None


class RestockSuggestionResponse(BaseModel):
    suggestions: List[RestockItem] = []
    total_due: int = 0


class LocationRecommendation(BaseModel):
    location_id: int
    location_name: str
    avg_price_delta_pct: float
    recommendation_score: float
    cheapest_item_count: int = 0
    description: str


class LocationRecommendationResponse(BaseModel):
    recommendations: List[LocationRecommendation] = []


class SharePricingRequest(BaseModel):
    share: bool


class SharePricingResponse(BaseModel):
    share_pricing_data: bool
    message: str
