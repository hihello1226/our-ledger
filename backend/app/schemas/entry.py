from __future__ import annotations
from pydantic import BaseModel
from datetime import date as date_type, datetime
from uuid import UUID
from typing import Optional


class EntryBase(BaseModel):
    type: str  # expense | income
    amount: int
    date: date_type
    category_id: Optional[UUID] = None
    memo: Optional[str] = None
    payer_member_id: UUID
    shared: bool = False


class EntryCreate(EntryBase):
    pass


class EntryUpdate(BaseModel):
    type: Optional[str] = None
    amount: Optional[int] = None
    date: Optional[date_type] = None
    category_id: Optional[UUID] = None
    memo: Optional[str] = None
    payer_member_id: Optional[UUID] = None
    shared: Optional[bool] = None


class EntryResponse(EntryBase):
    id: UUID
    household_id: UUID
    created_by_user_id: UUID
    created_at: datetime
    updated_at: datetime
    category_name: Optional[str] = None
    payer_name: Optional[str] = None

    class Config:
        from_attributes = True
