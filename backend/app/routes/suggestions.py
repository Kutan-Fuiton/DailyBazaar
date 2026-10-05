"""
routes/suggestions.py — Dual-Scope Item & Price Suggestions (Global Lexicon + Personal Database).

Supplies live autocomplete suggestions while typing in the Smart Notepad or List:
1. Global Database: Crowdsourced canonical lexicon items (bilingual, benchmark price/kg)
2. Personal Database: User's individual catalog with latest recorded prices from previous hauls
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel

from ..core.deps import get_current_user, get_user_db
from ..models.user import User
from ..models.item import Item, ItemPriceHistory
from ..models.lexicon import LexiconEntry, LexiconAlias

router = APIRouter(prefix="/suggestions", tags=["Suggestions"])


class SuggestionItem(BaseModel):
    id: Optional[int] = None
    name: str
    price: Optional[float] = None
    unit: Optional[str] = "kg"
    emoji: Optional[str] = "🥬"
    category: Optional[str] = "General"
    source: str  # "global" | "personal"
    subtitle: Optional[str] = None


class DualSuggestionResponse(BaseModel):
    query: str
    global_suggestions: List[SuggestionItem]
    personal_suggestions: List[SuggestionItem]


@router.get("/search", response_model=DualSuggestionResponse)
def search_dual_suggestions(
    q: str = Query(..., min_length=1),
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    query_str = q.strip().lower()

    # ── 1. Personal Items ─────────────────────────────────────────────────────
    personal_items: List[SuggestionItem] = []
    user_items = (
        db.query(Item)
        .filter(Item.user_id == current_user.id, Item.name.ilike(f"%{query_str}%"))
        .limit(limit)
        .all()
    )

    for item in user_items:
        # Fetch latest price from history
        latest_hist = (
            db.query(ItemPriceHistory.price)
            .filter(ItemPriceHistory.item_id == item.id)
            .order_by(ItemPriceHistory.recorded_at.desc())
            .first()
        )
        latest_price = float(latest_hist.price) if latest_hist and latest_hist.price else (
            float(item.price_per_unit) if item.price_per_unit else None
        )

        personal_items.append(
            SuggestionItem(
                id=item.id,
                name=item.name,
                price=latest_price,
                unit=item.unit or "piece",
                emoji=item.emoji or "🥬",
                category=item.category or "My Items",
                source="personal",
                subtitle=f"Last paid: ₹{round(latest_price)}" if latest_price else "From your history",
            )
        )

    # ── 2. Global Lexicon Items ───────────────────────────────────────────────
    global_items: List[SuggestionItem] = []
    seen_canonical = set()

    # Direct match on canonical / regional names
    lexicon_matches = (
        db.query(LexiconEntry)
        .filter(
            (LexiconEntry.canonical_name.ilike(f"%{query_str}%")) |
            (LexiconEntry.hindi_name.ilike(f"%{query_str}%")) |
            (LexiconEntry.bengali_name.ilike(f"%{query_str}%"))
        )
        .limit(limit)
        .all()
    )

    for entry in lexicon_matches:
        seen_canonical.add(entry.canonical_name.lower())
        regional_hint = []
        if entry.bengali_name:
            regional_hint.append(entry.bengali_name)
        if entry.hindi_name and entry.hindi_name != entry.bengali_name:
            regional_hint.append(entry.hindi_name)
        subtitle_text = " / ".join(regional_hint) if regional_hint else "Global Database"

        global_items.append(
            SuggestionItem(
                id=entry.id,
                name=entry.canonical_name,
                price=float(entry.avg_price_kg) if entry.avg_price_kg else None,
                unit=entry.default_unit or "kg",
                emoji=entry.emoji or "🥬",
                category=entry.category or "Groceries",
                source="global",
                subtitle=subtitle_text,
            )
        )

    # Secondary alias matches if limit not reached
    if len(global_items) < limit:
        alias_matches = (
            db.query(LexiconAlias)
            .join(LexiconEntry, LexiconAlias.entry_id == LexiconEntry.id)
            .filter(LexiconAlias.raw_alias.ilike(f"%{query_str}%"))
            .limit(limit - len(global_items))
            .all()
        )
        for alias in alias_matches:
            if alias.entry and alias.entry.canonical_name.lower() not in seen_canonical:
                seen_canonical.add(alias.entry.canonical_name.lower())
                global_items.append(
                    SuggestionItem(
                        id=alias.entry.id,
                        name=alias.entry.canonical_name,
                        price=float(alias.entry.avg_price_kg) if alias.entry.avg_price_kg else None,
                        unit=alias.entry.default_unit or "kg",
                        emoji=alias.entry.emoji or "🥬",
                        category=alias.entry.category or "Groceries",
                        source="global",
                        subtitle=f"Matched: '{alias.raw_alias}'",
                    )
                )

    return DualSuggestionResponse(
        query=q,
        global_suggestions=global_items,
        personal_suggestions=personal_items,
    )
