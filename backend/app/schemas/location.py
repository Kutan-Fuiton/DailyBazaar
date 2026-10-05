from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class LocationCreate(BaseModel):
    name: str
    city: Optional[str] = None
    address: Optional[str] = None


class LocationResponse(BaseModel):
    id: int
    name: str
    city: Optional[str]
    address: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class PriceAtLocation(BaseModel):
    item_name: str
    price: float
    unit: Optional[str]
    recorded_at: str


class LocationPriceReport(BaseModel):
    location: LocationResponse
    prices: List[PriceAtLocation]
