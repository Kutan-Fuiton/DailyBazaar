from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, List
from ..core.sanitizer import sanitize_string


class TransactionItemCreate(BaseModel):
    name: str
    qty: float = 1.0
    price: float = 0.0
    unit: Optional[str] = None

    @field_validator("name", "unit")
    @classmethod
    def sanitize_item_fields(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class TransactionItemResponse(BaseModel):
    id: int
    name: str
    qty: float
    price: float
    unit: Optional[str]
    item_id: Optional[int]
    model_config = {"from_attributes": True}


class TransactionCreate(BaseModel):
    title: str
    source: str = "Manual"
    status: str = "completed"
    location_id: Optional[int] = None
    items: List[TransactionItemCreate] = []

    @field_validator("title", "source", "status")
    @classmethod
    def sanitize_transaction_fields(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class TransactionUpdate(BaseModel):
    title: Optional[str] = None
    location_id: Optional[int] = None

    @field_validator("title")
    @classmethod
    def sanitize_update_title(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class TransactionResponse(BaseModel):
    id: int
    title: str
    total: float
    source: str
    status: str
    location_id: Optional[int]
    created_at: datetime
    items: List[TransactionItemResponse] = []
    model_config = {"from_attributes": True}
