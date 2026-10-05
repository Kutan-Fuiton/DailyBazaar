"""
routes/items.py — Item catalogue CRUD + aliases + price history.

All queries enforce user_id multitenancy.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, timedelta

from datetime import date, timedelta

from ..core.deps import get_current_user, get_user_db, get_main_db
from ..core.cache import get_cached_catalog, set_cached_catalog, invalidate_user_cache
from ..models.user import User
from ..models.item import Item, ItemAlias, ItemPriceHistory
from ..models.lexicon import LexiconEntry, LexiconAlias, LexiconOCRCorrection, LexiconFeedback
from ..schemas.item import ItemCreate, ItemResponse, AliasCreate, AliasResponse, PriceHistoryEntry

router = APIRouter(prefix="/items", tags=["Items"])


# ── Global Master Catalog (Lexicon) ──────────────────────────────────────────

@router.get("/global/stats")
def get_lexicon_stats(
    db: Session = Depends(get_main_db),
):
    """
    Returns statistics about the shared self-learning Lexicon engine.
    """
    total_entries = db.query(func.count(LexiconEntry.id)).scalar() or 0
    total_aliases = db.query(func.count(LexiconAlias.id)).scalar() or 0
    total_corrections = db.query(func.count(LexiconOCRCorrection.id)).scalar() or 0
    total_feedback = db.query(func.count(LexiconFeedback.id)).scalar() or 0
    return {
        "canonical_entries": total_entries,
        "aliases_mapped": total_aliases,
        "ocr_corrections": total_corrections,
        "feedback_events": total_feedback,
    }

@router.get("/global")
def search_global_items(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_main_db),
):
    """
    Search shared master Lexicon catalog across English, Bengali, and Hindi.
    """
    q = db.query(LexiconEntry)
    if category:
        q = q.filter(LexiconEntry.category.ilike(category))
    if search:
        term = f"%{search.strip()}%"
        q = q.outerjoin(LexiconAlias, LexiconAlias.entry_id == LexiconEntry.id).filter(
            (LexiconEntry.canonical_name.ilike(term)) |
            (LexiconEntry.bengali_name.ilike(term)) |
            (LexiconEntry.hindi_name.ilike(term)) |
            (LexiconAlias.raw_alias.ilike(term))
        ).distinct()
    entries = q.order_by(LexiconEntry.canonical_name).limit(limit).all()
    return [
        {
            "id": e.id,
            "name": e.canonical_name,
            "bengali_name": e.bengali_name,
            "hindi_name": e.hindi_name,
            "category": e.category,
            "unit": e.default_unit,
            "unit_family": e.unit_family,
            "emoji": e.emoji,
            "avg_price_kg": e.avg_price_kg,
            "aliases": [a.raw_alias for a in e.aliases[:6]],
        }
        for e in entries
    ]


@router.post("/from-global", response_model=ItemResponse, status_code=201)
def add_from_global(
    lexicon_id: int = Query(...),
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a master item from the Lexicon catalog into the user's personal inventory,
    marked with tag 'Not Bought Yet'.
    """
    entry = db.query(LexiconEntry).filter(LexiconEntry.id == lexicon_id).first()
    if not entry:
        raise HTTPException(404, "Lexicon item not found")

    existing = db.query(Item).filter(
        Item.user_id == current_user.id,
        Item.name.ilike(entry.canonical_name),
    ).first()
    if existing:
        return existing

    item = Item(
        user_id=current_user.id,
        name=entry.canonical_name,
        category=entry.category,
        unit=entry.default_unit,
        unit_family=entry.unit_family,
        emoji=entry.emoji,
        price_per_unit=entry.avg_price_kg,
        tag="Not Bought Yet",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    invalidate_user_cache(current_user.id)
    return item


# ── Autocomplete ─────────────────────────────────────────────────────────────

@router.get("/autocomplete")
def autocomplete_items(
    q: str = Query(..., min_length=1),
    limit: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fast fuzzy-matched autocomplete suggestions from 3 sources (priority order):
      1. User personal aliases  → source: "alias"
      2. User item catalog      → source: "personal"
      3. Global Lexicon (Bengali/Hindi/English) → source: "global"

    Each result: { display, canonical, unit, price, source, emoji }
    TTL-cached per user+prefix for 5 minutes.
    """
    from ..core.cache import _AUTOCOMPLETE_CACHE
    from ..models.lexicon import LexiconEntry, LexiconAlias
    from ..models.item import Item, ItemAlias

    q_clean = q.strip().lower()
    cache_key = f"autocomplete:{current_user.id}:{q_clean}"
    cached = _AUTOCOMPLETE_CACHE.get(cache_key)
    if cached is not None:
        return cached[:limit]

    results: list[dict] = []
    seen_canonical: set[str] = set()

    try:
        from rapidfuzz import process as rfp, fuzz
        _has_rf = True
    except ImportError:
        import difflib
        _has_rf = False

    # ── Priority 1: Personal aliases ─────────────────────────────────────────
    alias_rows = (
        db.query(ItemAlias, Item)
        .join(Item, ItemAlias.item_id == Item.id)
        .filter(Item.user_id == current_user.id)
        .all()
    )
    alias_map: dict[str, tuple[ItemAlias, Item]] = {
        al.alias.lower(): (al, it) for al, it in alias_rows
    }
    if _has_rf and alias_map:
        matches = rfp.extract(q_clean, list(alias_map.keys()), scorer=fuzz.WRatio, limit=limit)
        for m_key, score, _ in matches:
            if score >= 65:
                al, it = alias_map[m_key]
                can = it.name
                if can not in seen_canonical:
                    seen_canonical.add(can)
                    results.append({
                        "display": al.alias,
                        "canonical": can,
                        "unit": it.unit,
                        "price": it.price_per_unit,
                        "emoji": it.emoji or "🛒",
                        "source": "alias",
                    })
    else:
        for alias_key, (al, it) in alias_map.items():
            if q_clean in alias_key:
                can = it.name
                if can not in seen_canonical:
                    seen_canonical.add(can)
                    results.append({
                        "display": al.alias,
                        "canonical": can,
                        "unit": it.unit,
                        "price": it.price_per_unit,
                        "emoji": it.emoji or "🛒",
                        "source": "alias",
                    })

    # ── Priority 2: Personal item catalog ────────────────────────────────────
    personal_items = (
        db.query(Item)
        .filter(Item.user_id == current_user.id)
        .all()
    )
    personal_map: dict[str, Item] = {it.name.lower(): it for it in personal_items}
    if _has_rf and personal_map:
        matches = rfp.extract(q_clean, list(personal_map.keys()), scorer=fuzz.WRatio, limit=limit)
        for m_key, score, _ in matches:
            if score >= 60:
                it = personal_map[m_key]
                if it.name not in seen_canonical:
                    seen_canonical.add(it.name)
                    results.append({
                        "display": it.name,
                        "canonical": it.name,
                        "unit": it.unit,
                        "price": it.price_per_unit,
                        "emoji": it.emoji or "🛒",
                        "source": "personal",
                    })
    else:
        for name_key, it in personal_map.items():
            if q_clean in name_key:
                if it.name not in seen_canonical:
                    seen_canonical.add(it.name)
                    results.append({
                        "display": it.name,
                        "canonical": it.name,
                        "unit": it.unit,
                        "price": it.price_per_unit,
                        "emoji": it.emoji or "🛒",
                        "source": "personal",
                    })

    # ── Priority 3: Global Lexicon ────────────────────────────────────────────
    if len(results) < limit:
        from ..services.matching_service import _get_lexicon_corpus
        corpus = _get_lexicon_corpus(db)
        lex_map: dict[str, LexiconEntry] = {}
        for alias_key, entry in corpus.items():
            if entry.canonical_name not in seen_canonical:
                lex_map[alias_key] = entry

        if _has_rf and lex_map:
            gl_matches = rfp.extract(
                q_clean, list(lex_map.keys()), scorer=fuzz.WRatio, limit=limit - len(results)
            )
            for m_key, score, _ in gl_matches:
                if score >= 60:
                    entry = lex_map[m_key]
                    if entry.canonical_name not in seen_canonical:
                        seen_canonical.add(entry.canonical_name)
                        results.append({
                            "display": m_key.title() if m_key != entry.canonical_name.lower() else entry.canonical_name,
                            "canonical": entry.canonical_name,
                            "unit": entry.default_unit,
                            "price": entry.avg_price_kg,
                            "emoji": entry.emoji or "🛒",
                            "source": "global",
                        })
        else:
            for alias_key, entry in lex_map.items():
                if q_clean in alias_key and entry.canonical_name not in seen_canonical:
                    seen_canonical.add(entry.canonical_name)
                    results.append({
                        "display": alias_key.title(),
                        "canonical": entry.canonical_name,
                        "unit": entry.default_unit,
                        "price": entry.avg_price_kg,
                        "emoji": entry.emoji or "🛒",
                        "source": "global",
                    })

    _AUTOCOMPLETE_CACHE[cache_key] = results
    return results[:limit]


# ── List ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[ItemResponse])
def list_items(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=200),
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    if not search and not category and skip == 0 and limit is None:
        cached = get_cached_catalog(current_user.id)
        if cached is not None:
            return cached

    from sqlalchemy.orm import selectinload
    q = db.query(Item).options(selectinload(Item.aliases)).filter(Item.user_id == current_user.id)
    if search:
        q = q.filter(Item.name.ilike(f"%{search}%"))
    if category:
        q = q.filter(Item.category.ilike(category))

    q = q.order_by(Item.name).offset(skip)
    if limit is not None:
        q = q.limit(limit)

    items = q.all()

    if not search and not category and skip == 0 and limit is None:
        set_cached_catalog(current_user.id, items)

    return items


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", response_model=ItemResponse, status_code=201)
def create_item(
    body: ItemCreate,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Item).filter(
        Item.user_id == current_user.id,
        Item.name.ilike(body.name),
    ).first()
    if existing:
        raise HTTPException(400, "An item with this name already exists in your inventory")
    
    item_data = body.model_dump()
    item = Item(user_id=current_user.id, **item_data)
    db.add(item)
    db.commit()
    db.refresh(item)
    invalidate_user_cache(current_user.id)
    return item


# ── Get one ───────────────────────────────────────────────────────────────────

@router.get("/{item_id}", response_model=ItemResponse)
def get_item(
    item_id: int,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")
    return item


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{item_id}", status_code=204)
def delete_item(
    item_id: int,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")
    db.delete(item)
    db.commit()
    invalidate_user_cache(current_user.id)


# ── Aliases ───────────────────────────────────────────────────────────────────

@router.post("/{item_id}/aliases", response_model=AliasResponse, status_code=201)
def add_alias(
    item_id: int,
    body: AliasCreate,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")
    alias = ItemAlias(item_id=item_id, alias=body.alias.lower().strip())
    db.add(alias)
    db.commit()
    db.refresh(alias)
    invalidate_user_cache(current_user.id)
    return alias


@router.delete("/{item_id}/aliases/{alias_id}", status_code=204)
def delete_alias(
    item_id: int,
    alias_id: int,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")
        
    alias = db.query(ItemAlias).filter(
        ItemAlias.id == alias_id,
        ItemAlias.item_id == item_id,
    ).first()
    if not alias:
        raise HTTPException(404, "Alias not found")
    db.delete(alias)
    db.commit()
    invalidate_user_cache(current_user.id)


# ── Price history (30-day trend) ──────────────────────────────────────────────

@router.get("/{item_id}/history", response_model=List[PriceHistoryEntry])
def item_price_history(
    item_id: int,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Returns daily price data for the last 30 days from the user's own transactions."""
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")

    cutoff = date.today() - timedelta(days=30)
    rows = (
        db.query(
            ItemPriceHistory.recorded_at,
            func.avg(ItemPriceHistory.price).label("avg_price"),
        )
        .filter(
            ItemPriceHistory.item_id == item_id,
            ItemPriceHistory.recorded_at >= cutoff,
        )
        .group_by(ItemPriceHistory.recorded_at)
        .order_by(ItemPriceHistory.recorded_at)
        .all()
    )

    return [
        PriceHistoryEntry(date=str(r.recorded_at), price=round(r.avg_price, 2))
        for r in rows
    ]


# ── Item Intelligence: full analytics ────────────────────────────────────────

from ..schemas.item import ItemDetailsResponse


@router.get("/{item_id}/details", response_model=ItemDetailsResponse)
def item_details(
    item_id: int,
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns enriched item intelligence:
    - price_history (N-day trend)
    - price stats (current, avg, min, max, inflation %)
    - restock cadence (avg days between purchases)
    - vendor_comparison (cheapest location from transaction joins)
    - purchase_count + total_spent
    """
    from ..models.location import Location
    from datetime import datetime

    item = db.query(Item).filter(
        Item.id == item_id,
        Item.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")

    cutoff = date.today() - timedelta(days=days)

    # ── Price history trend ───────────────────────────────────────────────────
    history_rows = (
        db.query(
            ItemPriceHistory.recorded_at,
            func.avg(ItemPriceHistory.unit_price).label("avg_unit_price"),
            func.avg(ItemPriceHistory.price).label("avg_price"),
        )
        .filter(
            ItemPriceHistory.item_id == item_id,
            ItemPriceHistory.recorded_at >= cutoff,
        )
        .group_by(ItemPriceHistory.recorded_at)
        .order_by(ItemPriceHistory.recorded_at)
        .all()
    )

    price_history = [
        {"date": str(r.recorded_at), "price": round(r.avg_unit_price or r.avg_price or 0, 2)}
        for r in history_rows
    ]

    # ── Price stats ───────────────────────────────────────────────────────────
    all_unit_prices = [p["price"] for p in price_history if p["price"] > 0]
    current_price = all_unit_prices[-1] if all_unit_prices else (item.price_per_unit or 0)
    avg_price     = round(sum(all_unit_prices) / len(all_unit_prices), 2) if all_unit_prices else current_price
    min_price     = min(all_unit_prices) if all_unit_prices else current_price
    max_price     = max(all_unit_prices) if all_unit_prices else current_price
    inflation_pct = round(((current_price - avg_price) / avg_price) * 100, 1) if avg_price else 0.0

    # Find dates for min/max
    min_date = max_date = None
    for r in history_rows:
        p = round(r.avg_unit_price or r.avg_price or 0, 2)
        if p == min_price and not min_date:
            min_date = str(r.recorded_at)
        if p == max_price and not max_date:
            max_date = str(r.recorded_at)

    # ── Vendor comparison ─────────────────────────────────────────────────────
    from ..models.transaction import TransactionItem, Transaction

    vendor_rows = (
        db.query(
            Location.name,
            func.avg(TransactionItem.unit_price).label("avg_unit_price"),
            func.count(TransactionItem.id).label("purchase_count"),
        )
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .join(Location, Transaction.location_id == Location.id)
        .filter(
            TransactionItem.item_id == item_id,
            TransactionItem.unit_price.isnot(None),
            Transaction.user_id == current_user.id,
        )
        .group_by(Location.name)
        .order_by(func.avg(TransactionItem.unit_price))
        .limit(6)
        .all()
    )

    vendor_comparison = [
        {
            "vendor": r.name,
            "price": round(r.avg_unit_price, 2),
            "purchase_count": r.purchase_count,
        }
        for r in vendor_rows
    ]

    # ── Restock cadence ───────────────────────────────────────────────────────
    purchase_dates = (
        db.query(Transaction.created_at)
        .join(TransactionItem, TransactionItem.transaction_id == Transaction.id)
        .filter(
            TransactionItem.item_id == item_id,
            Transaction.user_id == current_user.id,
        )
        .order_by(Transaction.created_at)
        .all()
    )

    avg_cadence_days = None
    days_since_last  = None
    last_purchase_date = None

    if purchase_dates:
        last_purchase_date = purchase_dates[-1][0]
        days_since_last = (datetime.utcnow() - last_purchase_date).days
        if len(purchase_dates) > 1:
            gaps = [
                (purchase_dates[i][0] - purchase_dates[i-1][0]).days
                for i in range(1, len(purchase_dates))
            ]
            avg_cadence_days = round(sum(gaps) / len(gaps))

    # ── Totals ────────────────────────────────────────────────────────────────
    totals = (
        db.query(
            func.count(TransactionItem.id).label("count"),
            func.sum(TransactionItem.price).label("total_spent"),
        )
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .filter(
            TransactionItem.item_id == item_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )

    return {
        "item": item,
        "price_history": price_history,
        "stats": {
            "current_price": current_price,
            "avg_price": avg_price,
            "min_price": min_price,
            "max_price": max_price,
            "min_date": min_date,
            "max_date": max_date,
            "inflation_pct": inflation_pct,
        },
        "vendor_comparison": vendor_comparison,
        "cadence": {
            "avg_cadence_days": avg_cadence_days,
            "days_since_last": days_since_last,
            "last_purchase_date": str(last_purchase_date.date()) if last_purchase_date else None,
        },
        "purchase_count": totals.count if totals else 0,
        "total_spent": round(totals.total_spent or 0, 2) if totals else 0.0,
    }


# ── Item AI Insights (RAG-style LLM advisory) ─────────────────────────────────

from ..schemas.item import AIInsightsResponse
import os, json

_insight_cache: dict = {}


@router.get("/{item_id}/ai-insights", response_model=AIInsightsResponse)
async def item_ai_insights(
    item_id: int,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calls Gemini (or falls back gracefully) to generate concise, data-driven
    RAG insights about this item using the user's own purchase context.
    Cached for 24 hours per item to save API calls.
    """
    import hashlib, time as _time
    from ..models.transaction import TransactionItem, Transaction
    from datetime import datetime

    cache_key = f"{current_user.id}:{item_id}"
    if cache_key in _insight_cache:
        ts, data = _insight_cache[cache_key]
        if _time.time() - ts < 86400:  # 24h cache
            return data

    item = db.query(Item).filter(
        Item.id == item_id,
        Item.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")

    # Build purchase context for the prompt
    recent = (
        db.query(TransactionItem, Transaction.created_at)
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .filter(
            TransactionItem.item_id == item_id,
            Transaction.user_id == current_user.id,
        )
        .order_by(Transaction.created_at.desc())
        .limit(10)
        .all()
    )

    prices = [r[0].unit_price or r[0].price for r in recent if (r[0].unit_price or r[0].price)]
    avg_p  = round(sum(prices) / len(prices), 2) if prices else (item.price_per_unit or 0)
    curr_p = prices[0] if prices else avg_p
    count  = len(recent)

    context_str = (
        f"Item: {item.name}\n"
        f"Category: {item.category or 'General'}\n"
        f"Unit: {item.unit or 'piece'}\n"
        f"Times purchased: {count}\n"
        f"Current price: ₹{curr_p} per {item.unit or 'unit'}\n"
        f"30-day avg price: ₹{avg_p} per {item.unit or 'unit'}\n"
        f"Price trend: {'up' if curr_p > avg_p else 'down' if curr_p < avg_p else 'stable'} "
        f"({round(((curr_p - avg_p) / avg_p * 100) if avg_p else 0, 1)}% vs avg)\n"
    )

    prompt = (
        "You are Vaniq, an AI grocery and market intelligence assistant for Indian bazaar shoppers. "
        "Based on the user's real purchase data below, give exactly 3 short, hyper-specific advisory bullets:\n"
        "1. MARKET TIMING: Should the user buy now or wait? Based on price trend.\n"
        "2. STORAGE TIP: One practical storage or shelf-life tip for this item.\n"
        "3. SMART BUY: One bulk-buy or savings advice specific to this item's category.\n\n"
        f"Context:\n{context_str}\n\n"
        "Respond ONLY with a JSON object with this shape:\n"
        '{"market_timing": "...", "storage_tip": "...", "smart_buy": "..."}\n'
        "Keep each value under 120 characters. No markdown, no preamble."
    )

    # Try Gemini API
    try:
        import google.generativeai as genai
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            raise ValueError("No GEMINI_API_KEY")
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        resp = model.generate_content(prompt)
        raw = resp.text.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        insights = json.loads(raw.strip())
    except Exception:
        # Graceful static fallback — still useful
        trend = "above" if curr_p > avg_p else "below"
        insights = {
            "market_timing": (
                f"Price is currently {trend} your 30-day average. "
                f"{'Consider buying only what you need for now.' if curr_p > avg_p else 'Good time to stock up!'}"
            ),
            "storage_tip": (
                f"Store {item.name} in a cool, dry place. "
                "Check packaging for specific shelf-life guidelines."
            ),
            "smart_buy": (
                f"Buying {item.name} in bulk from a wholesale market typically saves 15–30%."
            ),
        }

    result = AIInsightsResponse(**insights)
    _insight_cache[cache_key] = (_time.time(), result)
    return result
