from __future__ import annotations
from pydantic import BaseModel, model_validator
from datetime import date as date_type, datetime
from uuid import UUID
from typing import Optional


class EntryBase(BaseModel):
    type: str  # expense | income | transfer
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

    class Config:
        from_attributes = True


class EntryListParams(BaseModel):
    """Query parameters for entry list"""
    month: Optional[str] = None  # YYYY-MM format
    category_id: Optional[UUID] = None
    payer_member_id: Optional[UUID] = None
    shared: Optional[bool] = None
    type: Optional[str] = None  # expense | income | transfer
    account_ids: Optional[list[UUID]] = None  # Multi-select filter
    sort_by: str = "occurred_at"  # occurred_at | amount
    sort_order: str = "desc"  # asc | desc
