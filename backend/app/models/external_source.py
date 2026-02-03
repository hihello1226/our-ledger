import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ExternalDataSource(Base):
    __tablename__ = "external_data_sources"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    household_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("households.id"), nullable=False
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # "google_sheet"
    sheet_id: Mapped[str] = mapped_column(String(255), nullable=False)
    sheet_name: Mapped[str] = mapped_column(String(255), default="Sheet1")
    account_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("accounts.id"), nullable=True
    )
    column_mapping: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    sync_direction: Mapped[str] = mapped_column(
        String(20), nullable=False, default="import"
    )  # "import" | "export" | "both"
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_synced_row: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    household: Mapped["Household"] = relationship("Household", back_populates="external_sources")
    created_by_user: Mapped["User"] = relationship("User", back_populates="external_sources")
    account: Mapped[Optional["Account"]] = relationship("Account")
    entry_refs: Mapped[list["EntryExternalRef"]] = relationship(
        "EntryExternalRef", back_populates="source", cascade="all, delete-orphan"
    )


class EntryExternalRef(Base):
    __tablename__ = "entry_external_refs"
    __table_args__ = (
        UniqueConstraint("source_id", "external_row_id", name="uq_source_external_row"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    entry_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("entries.id", ondelete="CASCADE"), nullable=False
    )
    source_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("external_data_sources.id", ondelete="CASCADE"), nullable=False
    )
    external_row_id: Mapped[str] = mapped_column(String(255), nullable=False)
    external_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    entry: Mapped["Entry"] = relationship("Entry", back_populates="external_refs")
    source: Mapped["ExternalDataSource"] = relationship(
        "ExternalDataSource", back_populates="entry_refs"
    )
