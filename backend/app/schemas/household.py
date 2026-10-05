"""
app/schemas/household.py — Pydantic schemas for household shared budgets and expense splitting.
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any


class HouseholdCreate(BaseModel):
    name: str


class HouseholdMemberResponse(BaseModel):
    id: int
    user_id: int
    username: str
    email: str
    role: str
    joined_at: datetime
    model_config = {"from_attributes": True}


class HouseholdResponse(BaseModel):
    id: int
    name: str
    owner_id: int
    created_at: datetime
    members: List[HouseholdMemberResponse] = []
    model_config = {"from_attributes": True}


class InviteMemberRequest(BaseModel):
    identifier: str  # username or email


class MemberSpendBreakdown(BaseModel):
    user_id: int
    username: str
    total_paid: float
    total_owed: float
    net_balance: float


class HouseholdSummaryResponse(BaseModel):
    household_id: int
    household_name: str
    total_spend: float
    members_count: int
    member_breakdown: List[MemberSpendBreakdown] = []


class SplitItem(BaseModel):
    user_id: int
    amount_owed: float


class CreateSplitRequest(BaseModel):
    household_id: Optional[int] = None
    splits: List[SplitItem]


class ExpenseSplitResponse(BaseModel):
    id: int
    transaction_id: int
    user_id: int
    username: str
    amount_owed: float
    settled: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class SettlementRecord(BaseModel):
    from_user_id: int
    from_username: str
    to_user_id: int
    to_username: str
    amount: float


class HouseholdSettlementsResponse(BaseModel):
    household_id: int
    settlements: List[SettlementRecord] = []
    total_unsettled_amount: float = 0.0
