import uuid
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    household_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("households.id"), nullable=True
    )  # NULL for default categories
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # expense | income
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    household: Mapped[Optional["Household"]] = relationship(
        "Household", back_populates="categories"
    )
    entries: Mapped[list["Entry"]] = relationship(
        "Entry", back_populates="category"
    )
