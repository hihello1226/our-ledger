from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class HouseholdBase(BaseModel):
    name: str


class HouseholdCreate(HouseholdBase):
    pass


class HouseholdJoin(BaseModel):
    invite_code: str


class HouseholdResponse(HouseholdBase):
    id: UUID
    invite_code: str
    created_at: datetime

    class Config:
        from_attributes = True


class MemberResponse(BaseModel):
    id: UUID
    user_id: UUID
    user_name: str
    user_email: str
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True
