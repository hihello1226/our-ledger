import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    household_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("households.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # "국민은행 주거래"
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # "personal" | "shared"
    balance: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # KRW integer
    is_shared_visible: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    owner_user: Mapped["User"] = relationship("User", back_populates="accounts")
    household: Mapped[Optional["Household"]] = relationship(
        "Household", back_populates="accounts"
    )
    entries: Mapped[list["Entry"]] = relationship(
        "Entry", back_populates="account", foreign_keys="Entry.account_id"
    )
    entries_from: Mapped[list["Entry"]] = relationship(
        "Entry", back_populates="transfer_from_account",
        foreign_keys="Entry.transfer_from_account_id"
    )
    entries_to: Mapped[list["Entry"]] = relationship(
        "Entry", back_populates="transfer_to_account",
        foreign_keys="Entry.transfer_to_account_id"
    )
