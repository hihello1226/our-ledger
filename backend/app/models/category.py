import uuid
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.household import Household
    from app.models.entry import Entry


class Category(Base):
    """대분류 카테고리"""
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    household_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("households.id"), nullable=True
    )  # NULL for default categories
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # expense | income
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # hex color
    icon: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # emoji

    household: Mapped[Optional["Household"]] = relationship(
        "Household", back_populates="categories"
    )
    entries: Mapped[list["Entry"]] = relationship(
        "Entry", back_populates="category"
    )
    subcategories: Mapped[list["Subcategory"]] = relationship(
        "Subcategory", back_populates="category", cascade="all, delete-orphan"
    )


class Subcategory(Base):
    """소분류 카테고리"""
    __tablename__ = "subcategories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    category: Mapped["Category"] = relationship(
        "Category", back_populates="subcategories"
    )
    entries: Mapped[list["Entry"]] = relationship(
        "Entry", back_populates="subcategory_rel"
    )
