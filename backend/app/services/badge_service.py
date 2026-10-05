"""
app/services/badge_service.py — Gamification badge evaluation engine.

Badges:
- first_scan: Confirmed first OCR scanned bill
- week_under_budget: 7-day spend below historical weekly average
- price_hawk: Logged purchase on items with significant price drop
- loyal_shopper: 5 or more logged hauls
- master_bargainer: 10 or more catalog items tracked
"""
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Set
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models.badge import UserBadge
from ..models.transaction import Transaction, TransactionItem, SourceEnum
from ..models.item import Item, ItemPriceHistory
from ..models.scan import Scan

ALL_BADGES = [
    {
        "badge_key": "first_scan",
        "name": "Vision Pioneer",
        "description": "Scanned and confirmed your first bazaar receipt with AI OCR.",
        "icon": "📸",
        "category": "Scanner"
    },
    {
        "badge_key": "week_under_budget",
        "name": "Frugal Master",
        "description": "Kept your weekly spending below historical averages.",
        "icon": "🛡️",
        "category": "Savings"
    },
    {
        "badge_key": "price_hawk",
        "name": "Price Hawk",
        "description": "Caught great price dips on everyday essentials.",
        "icon": "🦅",
        "category": "Intelligence"
    },
    {
        "badge_key": "loyal_shopper",
        "name": "Daily Shopper",
        "description": "Logged 5 or more market hauls on DailyBazaar.",
        "icon": "🛒",
        "category": "Consistency"
    },
    {
        "badge_key": "master_bargainer",
        "name": "Catalog Pro",
        "description": "Tracked 10 or more distinct groceries in your personal pantry.",
        "icon": "📋",
        "category": "Catalog"
    }
]


def evaluate_and_award(user_id: int, db: Session) -> List[str]:
    """
    Evaluates milestone criteria for user and awards any newly earned badges.
    Returns list of newly awarded badge keys.
    """
    existing = db.query(UserBadge.badge_key).filter(UserBadge.user_id == user_id).all()
    earned_keys: Set[str] = {r[0] for r in existing}

    newly_awarded = []

    def award(key: str):
        if key not in earned_keys:
            badge = UserBadge(user_id=user_id, badge_key=key)
            db.add(badge)
            earned_keys.add(key)
            newly_awarded.append(key)

    # 1. Check first_scan
    if "first_scan" not in earned_keys:
        has_ocr = (
            db.query(Transaction.id)
            .filter(Transaction.user_id == user_id, Transaction.source == SourceEnum.OCR)
            .first()
        )
        if has_ocr:
            award("first_scan")

    # 2. Check loyal_shopper (>= 5 transactions)
    if "loyal_shopper" not in earned_keys:
        tx_count = db.query(func.count(Transaction.id)).filter(Transaction.user_id == user_id).scalar() or 0
        if tx_count >= 5:
            award("loyal_shopper")

    # 3. Check master_bargainer (>= 10 items)
    if "master_bargainer" not in earned_keys:
        item_count = db.query(func.count(Item.id)).filter(Item.user_id == user_id).scalar() or 0
        if item_count >= 10:
            award("master_bargainer")

    # 4. Check week_under_budget
    if "week_under_budget" not in earned_keys:
        today = date.today()
        week_ago = today - timedelta(days=7)
        last_7d_spend = (
            db.query(func.sum(Transaction.total))
            .filter(Transaction.user_id == user_id, func.date(Transaction.created_at) >= week_ago)
            .scalar() or 0.0
        )
        total_spend = (
            db.query(func.sum(Transaction.total))
            .filter(Transaction.user_id == user_id)
            .scalar() or 0.0
        )
        first_tx = (
            db.query(func.min(Transaction.created_at))
            .filter(Transaction.user_id == user_id)
            .scalar()
        )
        if first_tx and total_spend > 0:
            total_days = max(14, (today - first_tx.date()).days)
            avg_weekly = (total_spend / total_days) * 7.0
            if last_7d_spend > 0 and last_7d_spend < avg_weekly:
                award("week_under_budget")

    # 5. Check price_hawk
    if "price_hawk" not in earned_keys:
        # Check if user has items with negative price change
        histories = (
            db.query(ItemPriceHistory.item_id)
            .join(Item, ItemPriceHistory.item_id == Item.id)
            .filter(Item.user_id == user_id)
            .count()
        )
        if histories >= 6:
            award("price_hawk")

    if newly_awarded:
        db.commit()

    return newly_awarded


def get_user_badges(user_id: int, db: Session) -> Dict[str, Any]:
    """Returns all badges with user's unlocked status and timestamps."""
    # First run evaluation to catch up
    evaluate_and_award(user_id, db)

    user_badges = db.query(UserBadge).filter(UserBadge.user_id == user_id).all()
    earned_map = {b.badge_key: b.earned_at for b in user_badges}

    # Streak calculation
    recent_dates = (
        db.query(func.date(Transaction.created_at).label("d"))
        .filter(Transaction.user_id == user_id)
        .group_by(func.date(Transaction.created_at))
        .order_by(func.date(Transaction.created_at).desc())
        .limit(30)
        .all()
    )

    streak_days = 0
    if recent_dates:
        d_set = {r.d for r in recent_dates}
        check_date = date.today()
        # Allow today or yesterday as start of streak
        if check_date not in d_set:
            check_date -= timedelta(days=1)
        while check_date in d_set:
            streak_days += 1
            check_date -= timedelta(days=1)

    badges_data = []
    for b in ALL_BADGES:
        key = b["badge_key"]
        is_earned = key in earned_map
        badges_data.append({
            "badge_key": key,
            "name": b["name"],
            "description": b["description"],
            "icon": b["icon"],
            "category": b["category"],
            "earned": is_earned,
            "earned_at": earned_map.get(key)
        })

    return {
        "badges": badges_data,
        "earned_count": len(earned_map),
        "total_count": len(ALL_BADGES),
        "current_streak_days": streak_days
    }
