from pydantic import BaseModel
from uuid import UUID


# Subcategory schemas
class SubcategoryBase(BaseModel):
    name: str


class SubcategoryCreate(SubcategoryBase):
    category_id: UUID


class SubcategoryUpdate(BaseModel):
    name: str | None = None
    sort_order: int | None = None


class SubcategoryResponse(SubcategoryBase):
    id: UUID
    category_id: UUID
    sort_order: int

    class Config:
        from_attributes = True


# Category schemas
class CategoryBase(BaseModel):
    name: str
    type: str  # expense | income


class CategoryCreate(CategoryBase):
    color: str | None = None
    icon: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    color: str | None = None
    icon: str | None = None
    sort_order: int | None = None


class CategoryResponse(CategoryBase):
    id: UUID
    household_id: UUID | None = None
    sort_order: int
    color: str | None = None
    icon: str | None = None
    subcategories: list[SubcategoryResponse] = []

    class Config:
        from_attributes = True


# For simpler responses without subcategories
class CategorySimpleResponse(CategoryBase):
    id: UUID
    household_id: UUID | None = None
    sort_order: int
    color: str | None = None
    icon: str | None = None

    class Config:
        from_attributes = True
