from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    db_name = Column(String(100), nullable=True)  # legacy dynamic db name
    share_pricing_data = Column(Boolean, default=False, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    items          = relationship("Item",         back_populates="user", cascade="all, delete-orphan")
    transactions   = relationship("Transaction",  back_populates="user", cascade="all, delete-orphan")
    locations      = relationship("Location",     back_populates="user", cascade="all, delete-orphan")
    shopping_lists = relationship("ShoppingList", back_populates="user", cascade="all, delete-orphan")

