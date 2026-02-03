import uuid
from datetime import datetime, date
from sqlalchemy import String, Integer, Date, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from app.core.database import Base


class Entry(Base):
    __tablename__ = "entries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    household_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("households.id"), nullable=False
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # expense | income
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # KRW (integer)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("categories.id"), nullable=True
    )
    memo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    payer_member_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("household_members.id"), nullable=False
    )
    shared: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    household: Mapped["Household"] = relationship("Household", back_populates="entries")
    created_by_user: Mapped["User"] = relationship("User", back_populates="entries_created")
    category: Mapped[Optional["Category"]] = relationship("Category", back_populates="entries")
    payer_member: Mapped["HouseholdMember"] = relationship(
        "HouseholdMember", back_populates="entries_as_payer"
    )
