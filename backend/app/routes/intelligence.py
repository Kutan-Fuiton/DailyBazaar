"""
app/routes/intelligence.py — Price intelligence, market comparisons, forecast, and restock routes.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from ..core.deps import get_current_user, get_user_db
from ..core.database import get_main_db
from ..models.user import User
from ..schemas.intelligence import (
    MarketComparisonResponse,
    PriceForecastResponse,
    RestockSuggestionResponse,
    LocationRecommendationResponse,
    SharePricingRequest,
    SharePricingResponse,
)
from ..services import intelligence_service

router = APIRouter(prefix="/intelligence", tags=["Intelligence"])


@router.get("/items/{item_id}/market-comparison", response_model=MarketComparisonResponse)
def get_market_comparison(
    item_id: int,
    location_id: Optional[int] = Query(None, description="Optional location filter"),
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns anonymous crowdsourced market price benchmark compared to user's average purchase price.
    Only aggregates from users with share_pricing_data enabled.
    """
    return intelligence_service.get_market_comparison(
        item_id=item_id,
        user_id=current_user.id,
        location_id=location_id,
        db=db
    )


@router.get("/items/{item_id}/price-forecast", response_model=PriceForecastResponse)
def get_price_forecast(
    item_id: int,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns 30-day linear price trend, recommendation, and confidence metric.
    """
    return intelligence_service.get_price_forecast(
        item_id=item_id,
        user_id=current_user.id,
        db=db
    )


@router.get("/restock-suggestions", response_model=RestockSuggestionResponse)
def get_restock_suggestions(
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calculates purchase cadence and predicts grocery restock needs.
    """
    return intelligence_service.get_restock_suggestions(
        user_id=current_user.id,
        db=db
    )


@router.get("/locations/recommendations", response_model=LocationRecommendationResponse)
def get_location_recommendations(
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ranks shopping locations by cost effectiveness on user's frequent items.
    """
    return intelligence_service.get_location_recommendations(
        user_id=current_user.id,
        db=db
    )


@router.patch("/share-pricing", response_model=SharePricingResponse)
def toggle_share_pricing(
    req: SharePricingRequest,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """
    Toggle anonymous crowdsourced price sharing consent.
    """
    val = intelligence_service.toggle_share_pricing(
        user_id=current_user.id,
        share=req.share,
        db=db
    )
    return {
        "share_pricing_data": val,
        "message": "Market data sharing enabled." if val else "Market data sharing disabled."
    }


@router.get("/public-market")
def get_public_market(
    lat: Optional[float] = Query(None, description="User latitude"),
    lng: Optional[float] = Query(None, description="User longitude"),
    market_name: Optional[str] = Query(None, description="Specific market or city name"),
    db: Session = Depends(get_main_db),
):
    """
    Public, unauthenticated market radar:
    Returns live wet market rates for nearby bazaars.
    Zero login or authentication required.
    """
    return intelligence_service.get_public_market_radar(
        lat=lat,
        lng=lng,
        market_name=market_name,
        db=db
    )

