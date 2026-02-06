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
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # expense | income | transfer
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # KRW (integer)
    date: Mapped[date] = mapped_column(Date, nullable=False)  # Kept for backward compatibility
    occurred_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)  # New: datetime for time-based sorting
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("categories.id"), nullable=True
    )
    memo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subcategory: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # 소분류
    payer_member_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("household_members.id"), nullable=False
    )
    shared: Mapped[bool] = mapped_column(Boolean, default=False)

    # Account related fields (for v1.1)
    account_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("accounts.id"), nullable=True
    )
    transfer_from_account_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("accounts.id"), nullable=True
    )
    transfer_to_account_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("accounts.id"), nullable=True
    )

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

    # Account relationships
    account: Mapped[Optional["Account"]] = relationship(
        "Account", back_populates="entries", foreign_keys=[account_id]
    )
    transfer_from_account: Mapped[Optional["Account"]] = relationship(
        "Account", back_populates="entries_from", foreign_keys=[transfer_from_account_id]
    )
    transfer_to_account: Mapped[Optional["Account"]] = relationship(
        "Account", back_populates="entries_to", foreign_keys=[transfer_to_account_id]
    )

    # External references
    external_refs: Mapped[list["EntryExternalRef"]] = relationship(
        "EntryExternalRef", back_populates="entry", cascade="all, delete-orphan"
    )
