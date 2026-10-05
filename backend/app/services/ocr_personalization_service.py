"""
services/ocr_personalization_service.py — Personalised OCR Context & Adaptive Learning.

Tailors OCR post-processing and text-matching to each user's unique buying habits:
1. Prioritizes the user's frequently bought items using frequency weights.
2. Applies learned OCR misread corrections.
3. Automatically trains the Lexicon Feedback loop when users edit recognized items.
"""
from typing import Dict, Optional, Any, Tuple
import logging
from sqlalchemy.orm import Session
from sqlalchemy import func

try:
    from rapidfuzz import process, fuzz
    _HAS_RAPIDFUZZ = True
except ImportError:
    import difflib
    _HAS_RAPIDFUZZ = False

from ..models.item import Item, ItemAlias
from ..models.transaction import Transaction, TransactionItem
from ..models.lexicon import LexiconOCRCorrection, LexiconFeedback, LexiconAlias, LexiconEntry
from .matching_service import match_item_name

logger = logging.getLogger("vaniq.ocr_personalization")


class PersonalisedOCRContext:
    """Pre-computes user vocabulary and weights for fast, personalized bill parsing."""

    def __init__(self, user_id: int, db: Session):
        self.user_id = user_id
        self.db = db

        # 1. User's personal items: {lower_name: Item}
        self.personal_items: Dict[str, Item] = {}
        items = db.query(Item).filter(Item.user_id == user_id).all()
        for it in items:
            self.personal_items[it.name.lower().strip()] = it
            for al in it.aliases:
                self.personal_items[al.alias.lower().strip()] = it

        # 2. Purchase frequency weights: {lower_name: boost_factor}
        # Items bought 10+ times get up to +15 bonus points in fuzzy score
        self.freq_boost: Dict[str, float] = {}
        try:
            freq_counts = (
                db.query(Item.name, func.count(TransactionItem.id))
                .join(TransactionItem, TransactionItem.item_id == Item.id)
                .join(Transaction, TransactionItem.transaction_id == Transaction.id)
                .filter(Transaction.user_id == user_id)
                .group_by(Item.name)
                .all()
            )
            max_count = max([c[1] for c in freq_counts], default=1)
            for name, count in freq_counts:
                # Scaled between 0.0 and 15.0
                self.freq_boost[name.lower().strip()] = (count / max_count) * 15.0
        except Exception as e:
            logger.debug(f"Could not compute frequency weights: {e}")

        # 3. OCR Corrections cache: {misread: corrected}
        self.corrections: Dict[str, str] = {}
        try:
            corrs = db.query(LexiconOCRCorrection).all()
            for c in corrs:
                self.corrections[c.misread.lower().strip()] = c.corrected
        except Exception as e:
            logger.debug(f"Could not load OCR corrections: {e}")

    def match(self, raw_text: str) -> Optional[Item]:
        """Match raw OCR line item using user context, frequency boost, and lexicon fallback."""
        if not raw_text:
            return None
        cleaned = raw_text.lower().strip()

        # Step A: Learned OCR correction
        corrected_name = self.corrections.get(cleaned, cleaned)

        # Step B: Personal exact match
        if corrected_name in self.personal_items:
            return self.personal_items[corrected_name]

        # Step C: Personal fuzzy match with frequency boost
        if self.personal_items:
            candidates = list(self.personal_items.keys())
            if _HAS_RAPIDFUZZ:
                best_match = None
                best_score = 0.0
                for cand in candidates:
                    base_score = fuzz.WRatio(corrected_name, cand)
                    boost = self.freq_boost.get(cand, 0.0)
                    total_score = base_score + boost
                    if total_score > best_score:
                        best_score = total_score
                        best_match = cand
                if best_match and best_score >= 80.0:
                    return self.personal_items[best_match]
            else:
                close = difflib.get_close_matches(corrected_name, candidates, n=1, cutoff=0.75)
                if close:
                    return self.personal_items[close[0]]

        # Step D: Fall back to 4-tier shared matcher
        return match_item_name(corrected_name, self.db, self.user_id)


def record_ocr_feedback(
    db: Session,
    raw_input: str,
    suggested_match: Optional[str],
    user_corrected: str,
    source: str = "ocr",
    user_id: Optional[int] = None,
) -> None:
    """
    Log an anonymous correction event and update OCR misread / alias frequency.
    """
    if not raw_input or not user_corrected:
        return
    cleaned_raw = raw_input.strip()
    cleaned_corrected = user_corrected.strip()

    if cleaned_raw.lower() == cleaned_corrected.lower():
        return  # No correction made

    try:
        # 1. Log anonymous feedback
        feedback = LexiconFeedback(
            raw_input=cleaned_raw,
            suggested_match=suggested_match or "",
            user_corrected=cleaned_corrected,
            source=source,
        )
        db.add(feedback)

        # 2. If source is OCR, update or create LexiconOCRCorrection
        if source == "ocr" and len(cleaned_raw) >= 3:
            existing_corr = (
                db.query(LexiconOCRCorrection)
                .filter(func.lower(LexiconOCRCorrection.misread) == cleaned_raw.lower())
                .first()
            )
            if existing_corr:
                existing_corr.frequency += 1
            else:
                db.add(LexiconOCRCorrection(
                    misread=cleaned_raw.lower(),
                    corrected=cleaned_corrected,
                    frequency=1,
                ))

        # 3. If user corrected to an existing Lexicon item, add/bump alias count
        canonical = (
            db.query(LexiconEntry)
            .filter(func.lower(LexiconEntry.canonical_name) == cleaned_corrected.lower())
            .first()
        )
        if canonical:
            existing_alias = (
                db.query(LexiconAlias)
                .filter(
                    LexiconAlias.entry_id == canonical.id,
                    func.lower(LexiconAlias.raw_alias) == cleaned_raw.lower(),
                )
                .first()
            )
            if existing_alias:
                existing_alias.confirmed_count += 1
            else:
                db.add(LexiconAlias(
                    entry_id=canonical.id,
                    raw_alias=cleaned_raw.lower(),
                    source="user_typed",
                    contributed_by=user_id,
                    confirmed_count=1,
                ))

        db.commit()
        logger.debug(f"[Feedback] Recorded feedback '{cleaned_raw}' -> '{cleaned_corrected}'")
    except Exception as e:
        db.rollback()
        logger.warning(f"Could not record feedback: {e}")
