"""
app/routes/households.py — Household budgeting and expense sharing routes.
"""
from fastapi import APIRouter, Depends, Path, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..core.deps import get_current_user, get_user_db
from ..models.user import User
from ..schemas.household import (
    HouseholdCreate,
    HouseholdResponse,
    HouseholdMemberResponse,
    InviteMemberRequest,
    HouseholdSummaryResponse,
    HouseholdSettlementsResponse,
    CreateSplitRequest,
    ExpenseSplitResponse,
)
from ..services import household_service

router = APIRouter(prefix="/households", tags=["Households"])


@router.post("", response_model=HouseholdResponse)
def create_household(
    body: HouseholdCreate,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Creates a new shared household with the current user as owner."""
    return household_service.create_household(name=body.name, owner=current_user, db=db)


@router.get("", response_model=List[HouseholdResponse])
def list_households(
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Lists all households the current user is a member of."""
    return household_service.list_user_households(user_id=current_user.id, db=db)


@router.post("/{household_id}/invite", response_model=HouseholdMemberResponse)
def invite_member(
    body: InviteMemberRequest,
    household_id: int = Path(..., description="ID of household"),
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Invites a user to the household by their username or email."""
    member = household_service.invite_member(
        household_id=household_id,
        identifier=body.identifier,
        current_user_id=current_user.id,
        db=db
    )
    return {
        "id": member.id,
        "user_id": member.user_id,
        "username": member.user.username,
        "email": member.user.email,
        "role": member.role,
        "joined_at": member.joined_at
    }


@router.get("/{household_id}/summary", response_model=HouseholdSummaryResponse)
def get_household_summary(
    household_id: int = Path(..., description="ID of household"),
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Returns combined total spending and net balance breakdown per member."""
    return household_service.get_household_summary(
        household_id=household_id,
        current_user_id=current_user.id,
        db=db
    )


@router.get("/{household_id}/settlements", response_model=HouseholdSettlementsResponse)
def get_household_settlements(
    household_id: int = Path(..., description="ID of household"),
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Returns simplified debt netting calculations ('who owes whom')."""
    return household_service.get_household_settlements(
        household_id=household_id,
        current_user_id=current_user.id,
        db=db
    )


@router.post("/transactions/{transaction_id}/split")
def split_transaction_endpoint(
    body: CreateSplitRequest,
    transaction_id: int = Path(..., description="ID of transaction to split"),
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Marks a transaction as a shared expense and creates split records."""
    splits = household_service.split_transaction(
        transaction_id=transaction_id,
        splits_data=[s.model_dump() for s in body.splits],
        household_id=body.household_id,
        current_user_id=current_user.id,
        db=db
    )
    return {"success": True, "splits_created": len(splits)}
