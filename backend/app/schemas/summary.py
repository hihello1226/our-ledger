from pydantic import BaseModel
from uuid import UUID


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


class MonthlySummary(BaseModel):
    month: str
    total_income: int
    total_expense: int
    balance: int
    by_category: list[CategorySummary]
    by_member: list[MemberSummary]


class SettlementItem(BaseModel):
    from_member_id: UUID
    from_member_name: str
    to_member_id: UUID
    to_member_name: str
    amount: int


class SettlementResponse(BaseModel):
    month: str
    total_shared_expense: int
    settlements: list[SettlementItem]
