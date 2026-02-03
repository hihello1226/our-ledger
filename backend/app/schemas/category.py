from pydantic import BaseModel
from uuid import UUID


class CategoryBase(BaseModel):
    name: str
    type: str  # expense | income


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: UUID
    household_id: UUID | None = None
    sort_order: int

    class Config:
        from_attributes = True
