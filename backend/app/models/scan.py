from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from ..core.database import Base


class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True)
    raw_ocr_text = Column(Text, nullable=True)
    parsed_data = Column(JSON, nullable=True)   # list of {name, qty, price, unit}
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=func.now())
