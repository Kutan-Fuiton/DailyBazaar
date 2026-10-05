"""
app/services/household_service.py — Household budget sharing, member invitations, and expense split settlements.
"""
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from fastapi import HTTPException

from ..models.household import Household, HouseholdMember, ExpenseSplit
from ..models.user import User
from ..models.transaction import Transaction


def create_household(name: str, owner: User, db: Session) -> Household:
    """Creates a new household and registers the creator as its owner."""
    household = Household(name=name.strip(), owner_id=owner.id)
    db.add(household)
    db.flush()

    member = HouseholdMember(
        household_id=household.id,
        user_id=owner.id,
        role="owner"
    )
    db.add(member)
    db.commit()
    db.refresh(household)
    return household


def list_user_households(user_id: int, db: Session) -> List[Household]:
    """Lists all households that the user belongs to."""
    return (
        db.query(Household)
        .join(HouseholdMember, Household.id == HouseholdMember.household_id)
        .filter(HouseholdMember.user_id == user_id)
        .all()
    )


def get_household_or_404(household_id: int, user_id: int, db: Session) -> Household:
    """Verifies that the household exists and the user is an active member."""
    household = db.query(Household).filter(Household.id == household_id).first()
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")

    is_member = (
        db.query(HouseholdMember)
        .filter(HouseholdMember.household_id == household_id, HouseholdMember.user_id == user_id)
        .first()
    )
    if not is_member:
        raise HTTPException(status_code=403, detail="Not authorized to access this household")

    return household


def invite_member(household_id: int, identifier: str, current_user_id: int, db: Session) -> HouseholdMember:
    """Invites/adds a user to the household by their username or email."""
    get_household_or_404(household_id, current_user_id, db)

    clean_id = identifier.strip().lower()
    target_user = (
        db.query(User)
        .filter(or_(func.lower(User.username) == clean_id, func.lower(User.email) == clean_id))
        .first()
    )
    if not target_user:
        raise HTTPException(status_code=404, detail=f"User '{identifier}' not found")

    existing = (
        db.query(HouseholdMember)
        .filter(HouseholdMember.household_id == household_id, HouseholdMember.user_id == target_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this household")

    new_member = HouseholdMember(
        household_id=household_id,
        user_id=target_user.id,
        role="member"
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member


def get_household_summary(household_id: int, current_user_id: int, db: Session) -> Dict[str, Any]:
    """
    Computes shared spending summary:
    - Member contributions (paid total)
    - Amount owed via splits
    - Net balance per member
    """
    household = get_household_or_404(household_id, current_user_id, db)

    members = db.query(HouseholdMember).filter(HouseholdMember.household_id == household_id).all()
    member_user_ids = [m.user_id for m in members]

    # Total spend across members
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id.in_(member_user_ids), Transaction.status == "completed")
        .all()
    )

    paid_map: Dict[int, float] = {uid: 0.0 for uid in member_user_ids}
    for tx in transactions:
        paid_map[tx.user_id] = paid_map.get(tx.user_id, 0.0) + float(tx.total or 0.0)

    # Calculate amount owed from unsettled ExpenseSplits
    splits = (
        db.query(ExpenseSplit)
        .filter(ExpenseSplit.household_id == household_id, ExpenseSplit.settled == False)
        .all()
    )
    owed_map: Dict[int, float] = {uid: 0.0 for uid in member_user_ids}
    for sp in splits:
        owed_map[sp.user_id] = owed_map.get(sp.user_id, 0.0) + float(sp.amount_owed or 0.0)

    breakdown = []
    for m in members:
        user = m.user
        paid = paid_map.get(m.user_id, 0.0)
        owed = owed_map.get(m.user_id, 0.0)
        net = paid - owed

        breakdown.append({
            "user_id": m.user_id,
            "username": user.username if user else f"User {m.user_id}",
            "total_paid": round(paid, 2),
            "total_owed": round(owed, 2),
            "net_balance": round(net, 2)
        })

    total_spend = sum(paid_map.values())

    return {
        "household_id": household.id,
        "household_name": household.name,
        "total_spend": round(total_spend, 2),
        "members_count": len(members),
        "member_breakdown": breakdown
    }


def get_household_settlements(household_id: int, current_user_id: int, db: Session) -> Dict[str, Any]:
    """
    Computes optimal settlements (who pays whom) for unsettled splits.
    """
    summary = get_household_summary(household_id, current_user_id, db)
    members = summary["member_breakdown"]

    # Separate creditors (positive net) and debtors (negative net)
    creditors = []
    debtors = []

    for m in members:
        net = m["net_balance"]
        if net > 0.5:
            creditors.append({"user_id": m["user_id"], "username": m["username"], "amount": net})
        elif net < -0.5:
            debtors.append({"user_id": m["user_id"], "username": m["username"], "amount": abs(net)})

    # Sort descending
    creditors.sort(key=lambda x: x["amount"], reverse=True)
    debtors.sort(key=lambda x: x["amount"], reverse=True)

    settlements = []
    c_idx, d_idx = 0, 0

    while c_idx < len(creditors) and d_idx < len(debtors):
        c = creditors[c_idx]
        d = debtors[d_idx]
        settle_amt = min(c["amount"], d["amount"])

        if settle_amt > 0.1:
            settlements.append({
                "from_user_id": d["user_id"],
                "from_username": d["username"],
                "to_user_id": c["user_id"],
                "to_username": c["username"],
                "amount": round(settle_amt, 2)
            })

        c["amount"] -= settle_amt
        d["amount"] -= settle_amt

        if c["amount"] < 0.1:
            c_idx += 1
        if d["amount"] < 0.1:
            d_idx += 1

    total_unsettled = sum(s["amount"] for s in settlements)
    return {
        "household_id": household_id,
        "settlements": settlements,
        "total_unsettled_amount": round(total_unsettled, 2)
    }


def split_transaction(transaction_id: int, splits_data: list, household_id: Optional[int], current_user_id: int, db: Session) -> List[ExpenseSplit]:
    """
    Splits a transaction amongst members.
    """
    tx = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    created = []
    for s in splits_data:
        sp = ExpenseSplit(
            household_id=household_id,
            transaction_id=tx.id,
            user_id=s["user_id"],
            amount_owed=s["amount_owed"],
            settled=False
        )
        db.add(sp)
        created.append(sp)

    db.commit()
    return created
