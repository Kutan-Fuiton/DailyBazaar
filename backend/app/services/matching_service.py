"""
services/matching_service.py — 4-Tier Item Matching Pipeline.

Tiers:
1. Personal Exact: User's personal Item.name or ItemAlias.alias
2. Lexicon Exact: Shared community aliases / canonical names (Bengali/Hindi/English)
3. RapidFuzz Fuzzy: Cross-corpus fuzzy matching (personal items + lexicon entries)
4. OCR Misread Correction: Learned misread map (e.g. 'besaw' -> 'Besan') -> retry Tiers 1-3
"""
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func

try:
    from rapidfuzz import process, fuzz
    _HAS_RAPIDFUZZ = True
except ImportError:
    import difflib
    _HAS_RAPIDFUZZ = False

from ..models.item import Item, ItemAlias
from ..models.lexicon import LexiconEntry, LexiconAlias, LexiconOCRCorrection
from ..core.cache import get_cached_lexicon, set_cached_lexicon


def _lexicon_to_transient_item(entry: LexiconEntry, user_id: Optional[int] = None) -> Item:
    """Create a transient (unpersisted) Item object populated from a LexiconEntry."""
    item = Item(
        id=None,
        user_id=user_id or 0,
        name=entry.canonical_name,
        category=entry.category or "General",
        unit=entry.default_unit or "piece",
        unit_family=entry.unit_family or "count",
        emoji=entry.emoji or "🛒",
        price_per_unit=entry.avg_price_kg,
        tag="Lexicon",
    )
    return item


def _get_lexicon_corpus(db: Session) -> Dict[str, LexiconEntry]:
    """Retrieve or build cached dictionary of alias -> LexiconEntry."""
    cached = get_cached_lexicon("full_corpus")
    if cached is not None:
        return cached

    corpus: Dict[str, LexiconEntry] = {}
    entries = db.query(LexiconEntry).all()
    for entry in entries:
        corpus[entry.canonical_name.lower().strip()] = entry
        if entry.hindi_name:
            corpus[entry.hindi_name.lower().strip()] = entry
        if entry.bengali_name:
            corpus[entry.bengali_name.lower().strip()] = entry

    aliases = db.query(LexiconAlias).join(LexiconEntry, LexiconAlias.entry_id == LexiconEntry.id).all()
    for alias in aliases:
        corpus[alias.raw_alias.lower().strip()] = alias.entry

    set_cached_lexicon("full_corpus", corpus)
    return corpus


def match_lexicon_entry(raw_name: str, db: Session) -> Optional[LexiconEntry]:
    """Match a raw name directly to a LexiconEntry."""
    if not raw_name:
        return None
    cleaned = raw_name.lower().strip()
    corpus = _get_lexicon_corpus(db)
    if cleaned in corpus:
        return corpus[cleaned]

    if _HAS_RAPIDFUZZ and corpus:
        match = process.extractOne(cleaned, list(corpus.keys()), scorer=fuzz.WRatio)
        if match and match[1] >= 80:
            return corpus[match[0]]
    elif corpus:
        close = difflib.get_close_matches(cleaned, list(corpus.keys()), n=1, cutoff=0.75)
        if close:
            return corpus[close[0]]

    return None


def match_item_name(
    raw_name: str,
    db: Session,
    user_id: Optional[int] = None,
    return_lexicon_fallback: bool = True,
) -> Optional[Item]:
    """
    4-Tier Item Matcher. Returns matched personal Item or transient Item from Lexicon.
    """
    if not raw_name:
        return None
    cleaned = raw_name.lower().strip()

    # ── Tier 1: Personal exact matches ──
    items_q = db.query(Item)
    if user_id:
        items_q = items_q.filter(Item.user_id == user_id)

    # 1a. Personal exact name
    personal_item = items_q.filter(func.lower(Item.name) == cleaned).first()
    if personal_item:
        return personal_item

    # 1b. Personal exact alias
    if user_id:
        personal_alias = (
            db.query(ItemAlias)
            .join(Item, ItemAlias.item_id == Item.id)
            .filter(Item.user_id == user_id, func.lower(ItemAlias.alias) == cleaned)
            .first()
        )
        if personal_alias and personal_alias.item:
            return personal_alias.item

    # ── Tier 2: Shared Lexicon exact alias / name match ──
    lexicon_corpus = _get_lexicon_corpus(db)
    if cleaned in lexicon_corpus:
        lex_entry = lexicon_corpus[cleaned]
        canonical_name = getattr(lex_entry, "canonical_name", None)
        if isinstance(lex_entry, str):
            canonical_name = lex_entry

        # Check if the user already has an item with this canonical name
        if canonical_name and user_id:
            user_canonical = items_q.filter(func.lower(Item.name) == canonical_name.lower()).first()
            if user_canonical:
                return user_canonical
        if return_lexicon_fallback and hasattr(lex_entry, "canonical_name"):
            return _lexicon_to_transient_item(lex_entry, user_id)

    # ── Tier 3: Fuzzy Matching ──
    # 3a. Personal fuzzy match
    all_personal = items_q.all() if user_id else []
    if all_personal:
        p_corpus: Dict[str, Item] = {}
        for it in all_personal:
            p_corpus[it.name.lower()] = it
            for al in it.aliases:
                p_corpus[al.alias.lower()] = it

        if _HAS_RAPIDFUZZ:
            p_match = process.extractOne(cleaned, list(p_corpus.keys()), scorer=fuzz.WRatio)
            if p_match and p_match[1] >= 80:
                return p_corpus[p_match[0]]
        else:
            p_close = difflib.get_close_matches(cleaned, list(p_corpus.keys()), n=1, cutoff=0.75)
            if p_close:
                return p_corpus[p_close[0]]

    # 3b. Lexicon fuzzy match
    if lexicon_corpus and return_lexicon_fallback:
        if _HAS_RAPIDFUZZ:
            l_match = process.extractOne(cleaned, list(lexicon_corpus.keys()), scorer=fuzz.WRatio)
            if l_match and l_match[1] >= 80:
                lex_entry = lexicon_corpus[l_match[0]]
                if user_id:
                    user_canonical = items_q.filter(func.lower(Item.name) == lex_entry.canonical_name.lower()).first()
                    if user_canonical:
                        return user_canonical
                return _lexicon_to_transient_item(lex_entry, user_id)
        else:
            l_close = difflib.get_close_matches(cleaned, list(lexicon_corpus.keys()), n=1, cutoff=0.75)
            if l_close:
                lex_entry = lexicon_corpus[l_close[0]]
                if user_id:
                    user_canonical = items_q.filter(func.lower(Item.name) == lex_entry.canonical_name.lower()).first()
                    if user_canonical:
                        return user_canonical
                return _lexicon_to_transient_item(lex_entry, user_id)

    # ── Tier 4: Learned OCR Corrections ──
    correction = db.query(LexiconOCRCorrection).filter(func.lower(LexiconOCRCorrection.misread) == cleaned).first()
    if correction and correction.corrected and correction.corrected.lower() != cleaned:
        # Re-run matching with the corrected canonical string
        return match_item_name(correction.corrected, db, user_id, return_lexicon_fallback)

    return None
