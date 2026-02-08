from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


class AccountBase(BaseModel):
    name: str
    bank_name: Optional[str] = None
    type: str  # "personal" | "shared"
    account_type: str = "checking"  # "checking" | "savings" | "deposit" | "securities" | "card"
    balance: Optional[int] = None
    is_shared_visible: bool = False


class AccountCreate(AccountBase):
    household_id: Optional[UUID] = None


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    bank_name: Optional[str] = None
    type: Optional[str] = None
    account_type: Optional[str] = None
    balance: Optional[int] = None
    is_shared_visible: Optional[bool] = None


class AccountResponse(AccountBase):
    id: UUID
    owner_user_id: UUID
    household_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    owner_name: Optional[str] = None

    class Config:
        from_attributes = True
