"""
models/lexicon.py — Shared crowdsourced Lexicon Database models.

Independent from individual users' private catalogs:
- LexiconEntry: Canonical item definitions (English, Hindi, Bengali)
- LexiconAlias: Colloquial names / bazaar spellings mapped to canonical items
- LexiconOCRCorrection: OCR misread mapping (e.g., 'Besaw' -> 'Besan')
- LexiconFeedback: Anonymous event log for model feedback and matching reinforcement
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class LexiconEntry(Base):
    __tablename__ = "lexicon_entries"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    canonical_name = Column(String(200), nullable=False, unique=True, index=True)
    hindi_name     = Column(String(200), nullable=True)
    bengali_name   = Column(String(200), nullable=True)
    category       = Column(String(100), nullable=True, index=True)
    unit_family    = Column(String(20), nullable=True)   # mass | volume | count
    default_unit   = Column(String(50), nullable=True)   # kg | L | piece
    emoji          = Column(String(10), nullable=True)
    avg_price_kg   = Column(Float, nullable=True)        # Benchmark price
    created_at     = Column(DateTime, server_default=func.now())
    updated_at     = Column(DateTime, server_default=func.now(), onupdate=func.now())

    aliases         = relationship("LexiconAlias", back_populates="entry", cascade="all, delete-orphan")
    ocr_corrections = relationship("LexiconOCRCorrection", back_populates="entry")


class LexiconAlias(Base):
    __tablename__ = "lexicon_aliases"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    entry_id        = Column(Integer, ForeignKey("lexicon_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    raw_alias       = Column(String(300), nullable=False, index=True)
    source          = Column(String(30), default="seed", nullable=False)   # seed | user_typed | ocr_read
    language_hint   = Column(String(10), nullable=True)                    # bn | hi | en | mixed
    confidence      = Column(Float, default=1.0)
    contributed_by  = Column(Integer, nullable=True)                       # anonymized user_id
    confirmed_count = Column(Integer, default=1)
    created_at      = Column(DateTime, server_default=func.now())

    entry = relationship("LexiconEntry", back_populates="aliases")

    __table_args__ = (
        UniqueConstraint("entry_id", "raw_alias", name="uq_entry_raw_alias"),
    )


class LexiconOCRCorrection(Base):
    __tablename__ = "lexicon_ocr_corrections"

    id        = Column(Integer, primary_key=True, autoincrement=True)
    misread   = Column(String(200), nullable=False, index=True)
    corrected = Column(String(200), nullable=False, index=True)
    entry_id  = Column(Integer, ForeignKey("lexicon_entries.id", ondelete="SET NULL"), nullable=True)
    frequency = Column(Integer, default=1)

    entry = relationship("LexiconEntry", back_populates="ocr_corrections")

    __table_args__ = (
        UniqueConstraint("misread", "corrected", name="uq_misread_corrected"),
    )


class LexiconFeedback(Base):
    """Anonymous log of user manual corrections to train matching pipelines."""
    __tablename__ = "lexicon_feedback"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    raw_input       = Column(String(300), nullable=False)
    suggested_match = Column(String(200), nullable=True)
    user_corrected  = Column(String(200), nullable=False)
    source          = Column(String(20), default="ocr")  # ocr | manual_entry | list
    created_at      = Column(DateTime, server_default=func.now())
