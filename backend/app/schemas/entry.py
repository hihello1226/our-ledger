from __future__ import annotations
from pydantic import BaseModel, model_validator
from datetime import date as date_type, datetime
from uuid import UUID
from typing import Optional


class EntryBase(BaseModel):
    type: str  # expense | income | transfer
    transfer_type: Optional[str] = None  # internal | external_out | external_in
    amount: int
    date: date_type
    occurred_at: Optional[datetime] = None  # New: for time-based sorting
    category_id: Optional[UUID] = None
    memo: Optional[str] = None
    payer_member_id: UUID
    shared: bool = False
    account_id: Optional[UUID] = None  # For income/expense
    transfer_from_account_id: Optional[UUID] = None  # For transfer
    transfer_to_account_id: Optional[UUID] = None  # For transfer

    @model_validator(mode="after")
    def validate_transfer_fields(self):
        if self.type == "transfer":
            if not self.transfer_from_account_id or not self.transfer_to_account_id:
                raise ValueError(
                    "transfer_from_account_id and transfer_to_account_id are required for transfer type"
                )
            if self.transfer_from_account_id == self.transfer_to_account_id:
                raise ValueError(
                    "transfer_from_account_id and transfer_to_account_id must be different"
                )
        return self


class EntryCreate(EntryBase):
    pass


class EntryUpdate(BaseModel):
    type: Optional[str] = None
    transfer_type: Optional[str] = None
    amount: Optional[int] = None
    date: Optional[date_type] = None
    occurred_at: Optional[datetime] = None
    category_id: Optional[UUID] = None
    memo: Optional[str] = None
    payer_member_id: Optional[UUID] = None
    shared: Optional[bool] = None
    account_id: Optional[UUID] = None
    transfer_from_account_id: Optional[UUID] = None
    transfer_to_account_id: Optional[UUID] = None


class EntryResponse(BaseModel):
    id: UUID
    household_id: UUID
    created_by_user_id: UUID
    type: str
    transfer_type: Optional[str] = None
    amount: int
    date: date_type
    occurred_at: Optional[datetime] = None
    category_id: Optional[UUID] = None
    memo: Optional[str] = None
    payer_member_id: UUID
    shared: bool
    account_id: Optional[UUID] = None
    transfer_from_account_id: Optional[UUID] = None
    transfer_to_account_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    category_name: Optional[str] = None
    payer_name: Optional[str] = None
    account_name: Optional[str] = None
    transfer_from_account_name: Optional[str] = None
    transfer_to_account_name: Optional[str] = None
    balance_after: Optional[int] = None  # 거래 후 계좌 잔액

    class Config:
        from_attributes = True


class EntrySummary(BaseModel):
    """필터링된 거래 합산 정보"""
    total_income: int = 0
    total_expense: int = 0
    total_transfer_in: int = 0  # 외부 입금
    total_transfer_out: int = 0  # 외부 송금
    net_balance: int = 0  # 순 잔액 변동


class EntryListParams(BaseModel):
    """Query parameters for entry list"""
    month: Optional[str] = None  # YYYY-MM format
    date_from: Optional[date_type] = None
    date_to: Optional[date_type] = None
    date_preset: Optional[str] = None  # today | this_week | this_month
    category_id: Optional[UUID] = None
    category_ids: Optional[list[UUID]] = None  # Multi-select filter
    payer_member_id: Optional[UUID] = None
    shared: Optional[bool] = None
    type: Optional[str] = None  # expense | income | transfer
    transfer_type: Optional[str] = None  # internal | external_out | external_in
    account_ids: Optional[list[UUID]] = None  # Multi-select filter
    amount_min: Optional[int] = None
    amount_max: Optional[int] = None
    memo_search: Optional[str] = None
    sort_by: str = "occurred_at"  # occurred_at | amount
    sort_order: str = "desc"  # asc | desc
    page: int = 1
    page_size: int = 50


class EntryListResponse(BaseModel):
    """Paginated response for entry list"""
    entries: list[EntryResponse]
    total_count: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool
    summary: EntrySummary  # 필터링된 전체 거래 합산
