from pydantic import BaseModel
from uuid import UUID
from typing import Optional


class CategorySummary(BaseModel):
    category_id: UUID | None
    category_name: str
    total: int


class MemberSummary(BaseModel):
    member_id: UUID
    member_name: str
    total_expense: int
    total_income: int
    shared_expense: int


class CumulativeSettlement(BaseModel):
    """Cumulative settlement balance per user"""
    user_id: UUID
    user_name: str
    cumulative_balance: int  # positive: receivable, negative: payable


class MonthlySummary(BaseModel):
    month: str
    total_income: int
    total_expense: int
    balance: int
    by_category: list[CategorySummary]
    by_member: list[MemberSummary]
    # New fields for v1.1
    cumulative_settlement: list[CumulativeSettlement] = []
    net_balance: int = 0  # Total assets (sum of all account balances)
    filtered_account_ids: list[UUID] = []  # Account IDs used for filtering


class SettlementItem(BaseModel):
    from_member_id: UUID
    from_member_name: str
    to_member_id: UUID
    to_member_name: str
    amount: int


class MonthlySettlementRecord(BaseModel):
    """Monthly settlement record for a user"""
    id: UUID
    user_id: UUID
    user_name: str
    month: str
    settlement_amount: int
    is_finalized: bool

    class Config:
        from_attributes = True


class SettlementResponse(BaseModel):
    month: str
    total_shared_expense: int
    settlements: list[SettlementItem]
    # New fields for v1.1
    cumulative_settlements: list[CumulativeSettlement] = []
    monthly_records: list[MonthlySettlementRecord] = []
