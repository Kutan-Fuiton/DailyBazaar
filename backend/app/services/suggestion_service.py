"""
services/suggestion_service.py — Historical price and quantity suggestions.

Implements the STATISTICAL_MEASURES.md suggestion rules:

  Missing price  → suggested_price = normalized_qty × avg_unit_price
  Missing qty    → most common previous qty for this item's unit_family

Weighted average formula (from spec):
  avg_unit_price = Σ(unit_price × normalized_qty) / Σ(normalized_qty)
"""
from __future__ import annotations
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models.item import Item, ItemPriceHistory
from ..models.transaction import TransactionItem, Transaction


def get_weighted_avg_unit_price(item_id: int, db: Session) -> Optional[float]:
    """
    Weighted average unit price for an item across all purchases.

      avg = Σ(unit_price × normalized_qty) / Σ(normalized_qty)

    Falls back to simple average of ItemPriceHistory.unit_price if
    normalized_qty is not stored on older rows.
    Returns None if no history exists.
    """
    # Prefer TransactionItem rows that have both unit_price and normalized_qty
    rows = (
        db.query(TransactionItem.unit_price, TransactionItem.normalized_qty)
        .filter(TransactionItem.item_id == item_id)
        .filter(TransactionItem.unit_price.isnot(None))
        .filter(TransactionItem.normalized_qty.isnot(None))
        .all()
    )

    if rows:
        total_weight = sum(r.normalized_qty for r in rows if r.normalized_qty)
        if total_weight == 0:
            return None
        weighted_sum = sum(
            (r.unit_price or 0) * (r.normalized_qty or 0) for r in rows
        )
        return round(weighted_sum / total_weight, 4)

    # Fallback — simple average from ItemPriceHistory.unit_price
    result = (
        db.query(func.avg(ItemPriceHistory.unit_price))
        .filter(ItemPriceHistory.item_id == item_id)
        .filter(ItemPriceHistory.unit_price.isnot(None))
        .scalar()
    )
    return round(float(result), 4) if result else None


def suggest_price(
    item_id: int,
    normalized_qty: float,
    db: Session,
) -> Optional[float]:
    """
    Suggest a total price based on the item's historical weighted avg unit price.

      suggested_price = normalized_qty × avg_unit_price

    Returns None when no history is available.
    """
    avg = get_weighted_avg_unit_price(item_id, db)
    if avg is None or not normalized_qty:
        return None
    return round(normalized_qty * avg, 2)


def suggest_qty(
    item_id: int,
    unit_family: str,
    db: Session,
) -> Optional[dict]:
    """
    Suggest a quantity based on the most common normalized_qty for this item
    in the given unit_family.

    Returns a dict with:
      { "normalized_qty": float, "unit": str, "display_qty": str }
    or None if no history exists.
    """
    rows = (
        db.query(
            TransactionItem.normalized_qty,
            TransactionItem.unit,
            TransactionItem.display_qty,
            func.count(TransactionItem.id).label("n"),
        )
        .filter(TransactionItem.item_id == item_id)
        .filter(TransactionItem.unit_family == unit_family)
        .filter(TransactionItem.normalized_qty.isnot(None))
        .group_by(
            TransactionItem.normalized_qty,
            TransactionItem.unit,
            TransactionItem.display_qty,
        )
        .order_by(func.count(TransactionItem.id).desc())
        .first()
    )

    if not rows:
        return None

    return {
        "normalized_qty": rows.normalized_qty,
        "unit": rows.unit,
        "display_qty": rows.display_qty or f"{rows.normalized_qty} {rows.unit}",
    }


def build_suggestions(
    item: Optional[Item],
    normalized_qty: Optional[float],
    total_price: Optional[float],
    unit_family: str,
    db: Session,
) -> dict:
    """
    Convenience wrapper. Given an OCR-parsed item row, determine which
    values are missing and return suggestions for both price and qty.

    Returns:
      {
        "suggested_price": float | None,
        "suggested_qty": float | None,
        "suggested_unit": str | None,
      }
    """
    if item is None:
        return {"suggested_price": None, "suggested_qty": None, "suggested_unit": None}

    s_price = None
    s_qty   = None
    s_unit  = None

    if (not total_price or total_price == 0) and normalized_qty:
        s_price = suggest_price(item.id, normalized_qty, db)

    if not normalized_qty or normalized_qty == 0:
        suggestion = suggest_qty(item.id, unit_family, db)
        if suggestion:
            s_qty  = suggestion["normalized_qty"]
            s_unit = suggestion["unit"]

    return {
        "suggested_price": s_price,
        "suggested_qty":   s_qty,
        "suggested_unit":  s_unit,
    }


from datetime import date, timedelta
from ..models.location import MarketPriceHistory
from ..core.cache import get_cached_market_price, set_cached_market_price


def get_market_latest_price(item_name: str, location_id: Optional[int], db: Session) -> Optional[float]:
    """
    Returns the most recent crowdsourced price for item_name at the given location.
    Falls back to a 30-day cross-location average if no single-location data exists.
    Utilizes in-memory TTLCache.
    """
    if not item_name:
        return None
    cached = get_cached_market_price(location_id, item_name)
    if cached is not None:
        return cached

    # 1. Location-specific match
    if location_id:
        row = (
            db.query(MarketPriceHistory.price)
            .filter(func.lower(MarketPriceHistory.item_name) == item_name.lower().strip())
            .filter(MarketPriceHistory.location_id == location_id)
            .order_by(MarketPriceHistory.recorded_at.desc())
            .first()
        )
        if row and row.price:
            p = round(float(row.price), 2)
            set_cached_market_price(location_id, item_name, p)
            return p

    # 2. Cross-location 30-day average
    cutoff = date.today() - timedelta(days=30)
    avg_price = (
        db.query(func.avg(MarketPriceHistory.price))
        .filter(func.lower(MarketPriceHistory.item_name) == item_name.lower().strip())
        .filter(MarketPriceHistory.recorded_at >= cutoff)
        .scalar()
    )
    if avg_price:
        p = round(float(avg_price), 2)
        set_cached_market_price(location_id, item_name, p)
        return p

    return None


def get_item_suggestion(
    name: str,
    db: Session,
    user_id: int,
    location_id: Optional[int] = None,
) -> dict:
    """
    Given an item name typed by the user, look up both their personal purchase history
    AND crowdsourced market pricing (location-aware).
    """
    from ..services.matching_service import match_item_name

    matched: Optional[Item] = match_item_name(name, db, user_id)
    if not matched:
        return {
            "suggested_price": None,
            "user_last_price": None,
            "market_price": None,
            "suggested_unit": None,
            "matched_name": None,
            "category": None,
            "emoji": None,
        }

    # 1. Personal last price
    user_last_price = None
    if matched.id:
        last_price_row = (
            db.query(ItemPriceHistory.price)
            .filter(ItemPriceHistory.item_id == matched.id)
            .order_by(ItemPriceHistory.recorded_at.desc())
            .first()
        )
        if last_price_row and last_price_row.price:
            user_last_price = round(float(last_price_row.price), 2)
        elif matched.price_per_unit:
            user_last_price = round(float(matched.price_per_unit), 2)

    # 2. Market crowdsourced price (location-aware)
    market_price = get_market_latest_price(matched.name, location_id, db)
    if not market_price and matched.price_per_unit and not user_last_price:
        # If matched is a transient Lexicon item with avg_price_kg
        market_price = round(float(matched.price_per_unit), 2)

    suggested_price = market_price if market_price is not None else user_last_price

    return {
        "suggested_price": suggested_price,
        "user_last_price": user_last_price,
        "market_price": market_price,
        "suggested_unit": matched.unit,
        "matched_name": matched.name,
        "category": matched.category,
        "emoji": matched.emoji,
    }
