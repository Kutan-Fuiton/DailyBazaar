from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..core.deps import get_current_user, get_user_db
from ..models.user import User
from ..models.location import Location, MarketPriceHistory
from ..schemas.location import LocationCreate, LocationResponse, LocationPriceReport, PriceAtLocation

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.get("", response_model=List[LocationResponse])
def list_locations(
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Location).filter(Location.user_id == current_user.id).order_by(Location.name).all()


@router.post("", response_model=LocationResponse, status_code=201)
def create_location(
    body: LocationCreate,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    loc = Location(user_id=current_user.id, **body.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.get("/{location_id}", response_model=LocationResponse)
def get_location(
    location_id: int,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    loc = db.query(Location).filter(Location.id == location_id, Location.user_id == current_user.id).first()
    if not loc:
        raise HTTPException(404, "Location not found")
    return loc


@router.get("/{location_id}/prices", response_model=LocationPriceReport)
def location_prices(
    location_id: int,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    loc = db.query(Location).filter(Location.id == location_id, Location.user_id == current_user.id).first()
    if not loc:
        raise HTTPException(404, "Location not found")

    rows = (
        db.query(MarketPriceHistory)
        .filter(MarketPriceHistory.location_id == location_id)
        .order_by(MarketPriceHistory.item_name, MarketPriceHistory.recorded_at.desc())
        .all()
    )

    return LocationPriceReport(
        location=loc,
        prices=[
            PriceAtLocation(
                item_name=r.item_name,
                price=r.price,
                unit=r.unit,
                recorded_at=str(r.recorded_at),
            )
            for r in rows
        ],
    )
