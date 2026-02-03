import uuid
from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    memberships: Mapped[list["HouseholdMember"]] = relationship(
        "HouseholdMember", back_populates="user"
    )
    entries_created: Mapped[list["Entry"]] = relationship(
        "Entry", back_populates="created_by_user"
    )
    accounts: Mapped[list["Account"]] = relationship(
        "Account", back_populates="owner_user"
    )
    external_sources: Mapped[list["ExternalDataSource"]] = relationship(
        "ExternalDataSource", back_populates="created_by_user"
    )
    monthly_settlements: Mapped[list["MonthlySettlement"]] = relationship(
        "MonthlySettlement", back_populates="user"
    )
