"""
schemas/shopping_list.py

Pydantic request/response models for the Shopping List API.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from ..core.sanitizer import sanitize_string


# ─────────────────────────────────────────────────────────────────────────────
# List Item schemas
# ─────────────────────────────────────────────────────────────────────────────

class ListItemCreate(BaseModel):
    """Used when adding a single item to an existing shopping list."""
    name:            str
    quantity:        Optional[float] = 1.0
    unit:            Optional[str]   = None
    user_price:      Optional[float] = None   # price the user is expecting to pay
    source:          Optional[str]   = "MANUAL"
    shop:            Optional[str]   = None

    @field_validator("name", "unit", "source", "shop")
    @classmethod
    def sanitize_item_fields(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class ListItemResponse(BaseModel):
    id:              int
    shopping_list_id: int
    item_id:         Optional[int]
    name:            str
    quantity:        float
    unit:            Optional[str]
    suggested_price: Optional[float]
    user_price:      Optional[float]
    is_bought:       bool
    source:          str
    created_at:      datetime
    shop:            Optional[str]   = None

    model_config = {"from_attributes": True}


class MarkBoughtRequest(BaseModel):
    """Sent when toggling individual item or marking all bought."""
    is_bought: bool = True


# ─────────────────────────────────────────────────────────────────────────────
# Shopping List schemas
# ─────────────────────────────────────────────────────────────────────────────

class ShoppingListCreate(BaseModel):
    """
    Create a shopping list in one shot.
    Items are optional — user can also add them later via POST /{list_id}/items.
    """
    title:  str
    items:  List[ListItemCreate] = []

    @field_validator("title")
    @classmethod
    def sanitize_title(cls, v: str) -> str:
        return sanitize_string(v) or "My Shopping List"


class ShoppingListStatusUpdate(BaseModel):
    """Advance a list to the next lifecycle stage."""
    status: str   # DRAFT | SAVED | SHOPPING | COMPLETED | CANCELLED


class CollaboratorResponse(BaseModel):
    user_id:  int
    username: str
    tag:      Optional[str] = None
    role:     str = "member"

    model_config = {"from_attributes": True}


class ShoppingListResponse(BaseModel):
    id:            int
    user_id:       int
    title:         str
    status:        str
    created_at:    datetime
    updated_at:    datetime
    completed_at:  Optional[datetime]
    items:         List[ListItemResponse] = []
    collaborators: List[CollaboratorResponse] = []
    is_owner:      Optional[bool] = None

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────────────────────
# Natural language parse schemas (no DB write — pure parse)
# ─────────────────────────────────────────────────────────────────────────────

class ParseTextRequest(BaseModel):
    """
    The raw text the user types. Example:
        "posto 100g\nalu 1kg\npeyaj 500g\nmaggie 2"
    """
    text: str = Field(..., min_length=1)


class ParsedListItem(BaseModel):
    """One structured item extracted from free-form text, enriched with market data."""
    name:            str
    quantity:        Optional[float] = None     # extracted from text; None = not specified
    unit:            Optional[str]   = None
    # User's own historical price for this item (personalised)
    user_last_price: Optional[float] = None
    # Crowdsourced live market price at user's location (if available)
    market_price:    Optional[float] = None
    # Best single suggested price (fallback chain: market → user_last → None)
    suggested_price: Optional[float] = None
    suggested_unit:  Optional[str]   = None
    # Price the user explicitly typed inline (e.g. "alu 1kg 30")
    price:           Optional[float] = None
    # Item metadata from lexicon
    category:        Optional[str]   = None
    emoji:           Optional[str]   = None
    # Parser confidence about qty/price disambiguation
    confidence:      str             = "high"  # "high" | "medium" | "low"
    shop:            Optional[str]   = None


class ParseTextResponse(BaseModel):
    """Returned by POST /shopping-lists/parse — not saved to DB."""
    items:     List[ParsedListItem]
    raw_text:  str


# ─────────────────────────────────────────────────────────────────────────────
# Finalize schema
# ─────────────────────────────────────────────────────────────────────────────

class FinalizeRequest(BaseModel):
    """
    Sent when the user is done shopping and wants to convert the list
    into a permanent Transaction.

    Only items with is_bought=True are included in the transaction.
    The user can still override individual prices here before confirming.
    """
    title:       Optional[str] = None         # falls back to the shopping list title
    location_id: Optional[int] = None
    # Optional: price overrides keyed by list_item_id
    price_overrides: Optional[dict] = None    # {list_item_id: price}
