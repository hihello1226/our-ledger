import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class MonthlySettlement(Base):
    __tablename__ = "monthly_settlements"
    __table_args__ = (
        UniqueConstraint(
            "household_id", "user_id", "month",
            name="uq_household_user_month"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    household_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("households.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    month: Mapped[str] = mapped_column(String(7), nullable=False)  # "YYYY-MM"
    settlement_amount: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # positive: receivable, negative: payable
    is_finalized: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    household: Mapped["Household"] = relationship("Household", back_populates="monthly_settlements")
    user: Mapped["User"] = relationship("User", back_populates="monthly_settlements")
