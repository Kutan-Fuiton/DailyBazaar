"""
models/shopping_list.py

ORM models for the Shopping List layer (plan §8, §27).

The shopping list lifecycle:
  DRAFT → SAVED → SHOPPING → COMPLETED
                            → CANCELLED

This layer sits between the user's intent (what they plan to buy)
and a Transaction (what they actually bought and paid for).
A list only becomes a Transaction after the user explicitly finalizes it.
"""
import enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, ForeignKey, Enum,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class ListStatusEnum(str, enum.Enum):
    DRAFT     = "DRAFT"
    SAVED     = "SAVED"
    SHOPPING  = "SHOPPING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class ListItemSourceEnum(str, enum.Enum):
    NATURAL_TEXT = "NATURAL_TEXT"   # parsed from free-form typed text
    MANUAL       = "MANUAL"         # added by user via structured form
    OCR          = "OCR"            # added from an OCR receipt scan


class ShoppingList(Base):
    __tablename__ = "shopping_lists"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    user_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title        = Column(String(300), nullable=False)
    status       = Column(Enum(ListStatusEnum), default=ListStatusEnum.SAVED, nullable=False)
    created_at   = Column(DateTime, server_default=func.now())
    updated_at   = Column(DateTime, server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime, nullable=True)  # set when status → COMPLETED

    # Relationships
    user          = relationship("User", back_populates="shopping_lists")
    items         = relationship("ListItem", back_populates="shopping_list", cascade="all, delete-orphan")
    collaborators = relationship("ShoppingListCollaborator", back_populates="shopping_list", cascade="all, delete-orphan")


class ListItem(Base):
    __tablename__ = "list_items"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    shopping_list_id = Column(Integer, ForeignKey("shopping_lists.id", ondelete="CASCADE"), nullable=False, index=True)
    # Nullable FK — item may not exist in catalog yet (new items are created at finalize time)
    item_id          = Column(Integer, ForeignKey("items.id", ondelete="SET NULL"), nullable=True)
    name             = Column(String(200), nullable=False)
    quantity         = Column(Float, default=1.0)
    unit             = Column(String(50), nullable=True)
    # Price the system suggested based on purchase history
    suggested_price  = Column(Float, nullable=True)
    # Price the user confirmed / overrode while shopping
    user_price       = Column(Float, nullable=True)
    is_bought        = Column(Boolean, default=False, nullable=False)
    source           = Column(Enum(ListItemSourceEnum), default=ListItemSourceEnum.MANUAL)
    shop             = Column(String(150), nullable=True)
    created_at       = Column(DateTime, server_default=func.now())

    # Relationships
    shopping_list = relationship("ShoppingList", back_populates="items")
    item          = relationship("Item")


class ShoppingListCollaborator(Base):
    """
    Householder collaborators on this list.
    Collaborators have real-time synchronized access to view and check off items.
    """
    __tablename__ = "shopping_list_collaborators"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    shopping_list_id = Column(Integer, ForeignKey("shopping_lists.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id          = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role             = Column(String(50), default="member", nullable=False)
    created_at       = Column(DateTime, server_default=func.now())

    shopping_list = relationship("ShoppingList", back_populates="collaborators")
    user          = relationship("User")
