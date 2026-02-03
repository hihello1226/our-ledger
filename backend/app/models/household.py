import uuid
import secrets
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


def generate_invite_code() -> str:
    return secrets.token_urlsafe(8)[:12].upper()


class Household(Base):
    __tablename__ = "households"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    invite_code: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, default=generate_invite_code
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    members: Mapped[list["HouseholdMember"]] = relationship(
        "HouseholdMember", back_populates="household"
    )
    categories: Mapped[list["Category"]] = relationship(
        "Category", back_populates="household"
    )
    entries: Mapped[list["Entry"]] = relationship(
        "Entry", back_populates="household"
    )


class HouseholdMember(Base):
    __tablename__ = "household_members"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    household_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("households.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(20), default="member")  # owner | member
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    household: Mapped["Household"] = relationship("Household", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="memberships")
    entries_as_payer: Mapped[list["Entry"]] = relationship(
        "Entry", back_populates="payer_member"
    )

    __table_args__ = (
        # Unique constraint on household_id and user_id
        {"sqlite_autoincrement": True},
    )
