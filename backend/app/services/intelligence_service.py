"""
app/services/intelligence_service.py — Price intelligence, crowdsourced comparison, forecasting, and restock engine.

Features:
- get_market_comparison: Aggregates anonymized pricing across opted-in users
- get_price_forecast: 30-day linear trend and purchasing recommendation
- get_restock_suggestions: Purchase cadence analysis to predict replenishment needs
- get_location_recommendations: Store price delta rankings for frequent items
- toggle_share_pricing: User consent management for crowdsourced price sharing
"""
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from ..models.item import Item, ItemPriceHistory
from ..models.transaction import Transaction, TransactionItem
from ..models.location import Location, MarketPriceHistory
from ..models.user import User


def get_market_comparison(item_id: int, user_id: int, location_id: Optional[int], db: Session) -> Dict[str, Any]:
    """
    Computes crowdsourced benchmark pricing for an item.
    Only includes data from users who have share_pricing_data = True.
    Excludes the requesting user's own data from market aggregation.
    """
    item = db.query(Item).filter(Item.id == item_id, Item.user_id == user_id).first()
    if not item:
        return {
            "item_id": item_id,
            "user_avg_price": None,
            "market_avg_price": None,
            "percentile": None,
            "location_id": location_id,
            "sample_size": 0,
            "savings_pct": None,
            "status": "item_not_found"
        }

    # 1. User's own average price for this item
    user_hist = db.query(ItemPriceHistory).filter(ItemPriceHistory.item_id == item_id).all()
    if user_hist:
        valid_prices = [h.unit_price if (h.unit_price and h.unit_price > 0) else h.price for h in user_hist]
        user_avg = sum(valid_prices) / len(valid_prices) if valid_prices else item.price_per_unit
    else:
        user_avg = item.price_per_unit

    # 2. Market comparison across opted-in users for items with matching name
    market_query = (
        db.query(ItemPriceHistory.unit_price, ItemPriceHistory.price)
        .join(Item, ItemPriceHistory.item_id == Item.id)
        .join(User, Item.user_id == User.id)
        .filter(
            User.share_pricing_data == True,
            User.id != user_id,
            func.lower(Item.name) == item.name.lower()
        )
    )

    market_records = market_query.all()
    market_prices = []
    for row in market_records:
        p = row.unit_price if (row.unit_price and row.unit_price > 0) else row.price
        if p and p > 0:
            market_prices.append(float(p))

    # Also check MarketPriceHistory if location_id specified or general market prices
    if location_id:
        loc_history = db.query(MarketPriceHistory).filter(
            MarketPriceHistory.location_id == location_id,
            func.lower(MarketPriceHistory.item_name) == item.name.lower()
        ).all()
        for rec in loc_history:
            if rec.price > 0:
                market_prices.append(float(rec.price))

    sample_size = len(market_prices)

    if sample_size == 0:
        return {
            "item_id": item_id,
            "user_avg_price": round(user_avg, 2) if user_avg is not None else None,
            "market_avg_price": round(user_avg, 2) if user_avg is not None else None,
            "percentile": 50.0,
            "location_id": location_id,
            "sample_size": 0,
            "savings_pct": 0.0,
            "status": "insufficient_market_data"
        }

    market_avg = sum(market_prices) / sample_size

    # Percentile: % of market prices that are greater than or equal to user's price
    if user_avg is not None and user_avg > 0:
        cheaper_count = sum(1 for p in market_prices if p < user_avg)
        percentile = round((cheaper_count / sample_size) * 100.0, 1)
        # savings_pct: positive if user paid less than market average
        savings_pct = round(((market_avg - user_avg) / market_avg) * 100.0, 1)
    else:
        percentile = 50.0
        savings_pct = 0.0

    return {
        "item_id": item_id,
        "user_avg_price": round(user_avg, 2) if user_avg is not None else None,
        "market_avg_price": round(market_avg, 2),
        "percentile": percentile,
        "location_id": location_id,
        "sample_size": sample_size,
        "savings_pct": savings_pct,
        "status": "ok"
    }


def get_price_forecast(item_id: int, user_id: int, db: Session) -> Dict[str, Any]:
    """
    Computes a 30-day linear momentum trend for an item.
    Returns trend ('rising' | 'falling' | 'stable'), best buy window, and confidence.
    """
    item = db.query(Item).filter(Item.id == item_id, Item.user_id == user_id).first()
    if not item:
        return {
            "item_id": item_id,
            "current_price": None,
            "trend": "stable",
            "best_buy_window": "No historical data available",
            "confidence": 0.0,
            "projected_price_7d": None
        }

    since_date = date.today() - timedelta(days=45)
    histories = (
        db.query(ItemPriceHistory)
        .filter(ItemPriceHistory.item_id == item_id, ItemPriceHistory.recorded_at >= since_date)
        .order_by(ItemPriceHistory.recorded_at.asc())
        .all()
    )

    if not histories or len(histories) < 2:
        curr = item.price_per_unit or 0.0
        return {
            "item_id": item_id,
            "current_price": round(curr, 2) if curr else None,
            "trend": "stable",
            "best_buy_window": "Fair price window anytime this week",
            "confidence": 0.3,
            "projected_price_7d": round(curr, 2) if curr else None
        }

    points = []
    for h in histories:
        val = h.unit_price if (h.unit_price and h.unit_price > 0) else h.price
        points.append((h.recorded_at, float(val)))

    # Compute simple linear slope over day offsets
    first_date = points[0][0]
    x_vals = [(pt[0] - first_date).days for pt in points]
    y_vals = [pt[1] for pt in points]

    n = len(points)
    mean_x = sum(x_vals) / n
    mean_y = sum(y_vals) / n

    denom = sum((x - mean_x) ** 2 for x in x_vals)
    slope = (sum((x - mean_x) * (y - mean_y) for x, y in zip(x_vals, y_vals)) / denom) if denom != 0 else 0.0

    current_price = y_vals[-1]
    pct_change_daily = (slope / mean_y) if mean_y > 0 else 0.0

    # Project 7 days into future
    projected_7d = max(0.0, current_price + (slope * 7))

    if pct_change_daily > 0.005:
        trend = "rising"
        best_buy_window = "Buy now — prices trending upwards (+{:.1f}%/wk)".format(pct_change_daily * 700)
    elif pct_change_daily < -0.005:
        trend = "falling"
        best_buy_window = "Hold off if possible — prices cooling down ({:.1f}%/wk)".format(pct_change_daily * 700)
    else:
        trend = "stable"
        best_buy_window = "Steady prices — optimal purchase window anytime this week"

    confidence = min(0.95, round(0.4 + (n * 0.08), 2))

    return {
        "item_id": item_id,
        "current_price": round(current_price, 2),
        "trend": trend,
        "best_buy_window": best_buy_window,
        "confidence": confidence,
        "projected_price_7d": round(projected_7d, 2)
    }


def get_restock_suggestions(user_id: int, db: Session) -> Dict[str, Any]:
    """
    Computes avg purchase cadence per item from transaction history and predicts what is due for restock.
    """
    rows = (
        db.query(
            TransactionItem.name,
            TransactionItem.item_id,
            Transaction.created_at,
            Item.emoji,
            Item.category
        )
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .outerjoin(Item, TransactionItem.item_id == Item.id)
        .filter(Transaction.user_id == user_id)
        .order_by(TransactionItem.name, Transaction.created_at.asc())
        .all()
    )

    if not rows:
        return {"suggestions": [], "total_due": 0}

    # Group timestamps by normalized name
    items_history: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        norm_name = r.name.strip().title()
        if norm_name not in items_history:
            items_history[norm_name] = {
                "item_id": r.item_id,
                "emoji": r.emoji,
                "category": r.category,
                "dates": []
            }
        # Keep item_id if updated
        if r.item_id and not items_history[norm_name]["item_id"]:
            items_history[norm_name]["item_id"] = r.item_id
        if r.emoji and not items_history[norm_name]["emoji"]:
            items_history[norm_name]["emoji"] = r.emoji
        if r.created_at:
            items_history[norm_name]["dates"].append(r.created_at)

    now = datetime.now()
    suggestions = []
    total_due = 0

    for name, meta in items_history.items():
        dates = meta["dates"]
        if not dates:
            continue

        last_date = dates[-1]
        days_since = max(0, (now - last_date).days)

        if len(dates) >= 2:
            # Average interval between consecutive purchases
            intervals = [(dates[i] - dates[i-1]).total_seconds() / 86400.0 for i in range(1, len(dates))]
            avg_interval = max(1.0, sum(intervals) / len(intervals))
        else:
            # Default cadence assumption if only bought once
            avg_interval = 7.0

        ratio = days_since / avg_interval
        if ratio >= 1.0:
            urgency = "due"
            total_due += 1
        elif ratio >= 0.7:
            urgency = "upcoming"
        else:
            urgency = "stocked"

        suggestions.append({
            "item_id": meta["item_id"] or 0,
            "item_name": name,
            "emoji": meta["emoji"] or "🛒",
            "category": meta["category"] or "Grocery",
            "avg_interval_days": round(avg_interval, 1),
            "days_since_last_purchase": days_since,
            "urgency": urgency,
            "last_purchased_at": last_date.strftime("%Y-%m-%d")
        })

    # Sort: due first, then upcoming, then highest days_since
    urgency_order = {"due": 0, "upcoming": 1, "stocked": 2}
    suggestions.sort(key=lambda s: (urgency_order[s["urgency"]], -s["days_since_last_purchase"]))

    return {"suggestions": suggestions, "total_due": total_due}


def get_location_recommendations(user_id: int, db: Session) -> Dict[str, Any]:
    """
    Ranks user's locations by average price delta for frequent items using MarketPriceHistory.
    """
    locations = db.query(Location).filter(Location.user_id == user_id).all()
    if not locations:
        return {"recommendations": []}

    # Find user's top 10 items by purchase frequency
    top_items_rows = (
        db.query(TransactionItem.name, func.count(TransactionItem.id).label("cnt"))
        .join(Transaction, TransactionItem.transaction_id == Transaction.id)
        .filter(Transaction.user_id == user_id)
        .group_by(TransactionItem.name)
        .order_by(desc("cnt"))
        .limit(10)
        .all()
    )

    if not top_items_rows:
        recs = [
            {
                "location_id": loc.id,
                "location_name": loc.name,
                "avg_price_delta_pct": 0.0,
                "recommendation_score": 5.0,
                "cheapest_item_count": 0,
                "description": "Add purchase hauls with this location to unlock savings comparison."
            }
            for loc in locations
        ]
        return {"recommendations": recs}

    top_names = [r[0].lower() for r in top_items_rows]

    # Calculate overall avg price per item across all records
    overall_prices = (
        db.query(
            func.lower(MarketPriceHistory.item_name).label("name"),
            func.avg(MarketPriceHistory.price).label("avg_p")
        )
        .group_by(func.lower(MarketPriceHistory.item_name))
        .all()
    )
    overall_map = {row.name: float(row.avg_p) for row in overall_prices if row.avg_p}

    recommendations = []
    for loc in locations:
        loc_history = db.query(MarketPriceHistory).filter(
            MarketPriceHistory.location_id == loc.id
        ).all()

        if not loc_history:
            recommendations.append({
                "location_id": loc.id,
                "location_name": loc.name,
                "avg_price_delta_pct": 0.0,
                "recommendation_score": 5.0,
                "cheapest_item_count": 0,
                "description": f"No recent price logs recorded at {loc.name}."
            })
            continue

        deltas = []
        cheapest_count = 0
        for entry in loc_history:
            canonical = entry.item_name.lower()
            if canonical in overall_map and overall_map[canonical] > 0:
                benchmark = overall_map[canonical]
                delta_pct = ((entry.price - benchmark) / benchmark) * 100.0
                deltas.append(delta_pct)
                if delta_pct < -2.0:
                    cheapest_count += 1

        avg_delta = (sum(deltas) / len(deltas)) if deltas else 0.0
        # Score from 1 to 10 (cheaper gets higher score)
        score = max(1.0, min(10.0, 7.0 - (avg_delta * 0.2)))

        if avg_delta < -3.0:
            desc_text = f"Great budget pick! Prices run {abs(avg_delta):.1f}% cheaper than average."
        elif avg_delta > 3.0:
            desc_text = f"Slightly premium market (+{avg_delta:.1f}% above your benchmark)."
        else:
            desc_text = "Competitive baseline pricing within normal market ranges."

        recommendations.append({
            "location_id": loc.id,
            "location_name": loc.name,
            "avg_price_delta_pct": round(avg_delta, 1),
            "recommendation_score": round(score, 1),
            "cheapest_item_count": cheapest_count,
            "description": desc_text
        })

    recommendations.sort(key=lambda r: r["avg_price_delta_pct"])
    return {"recommendations": recommendations}


def toggle_share_pricing(user_id: int, share: bool, db: Session) -> bool:
    """Updates user's anonymous pricing sharing consent."""
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.share_pricing_data = share
        db.commit()
        db.refresh(user)
        return user.share_pricing_data or False
    return False
