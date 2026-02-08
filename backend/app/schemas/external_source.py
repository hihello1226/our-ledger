from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


# CSV Import Schemas
class CSVColumnMapping(BaseModel):
    date: str = ""
    amount: str = ""
    type: Optional[str] = None  # expense/income/transfer
    category: Optional[str] = None
    subcategory: Optional[str] = None  # 소분류
    memo: Optional[str] = None
    account: Optional[str] = None


class CSVPreviewRow(BaseModel):
    row_number: int
    date: str
    amount: int
    type: str
    category: Optional[str] = None
    memo: Optional[str] = None
    account: Optional[str] = None
    is_duplicate: bool = False
    error: Optional[str] = None


class CSVUploadResponse(BaseModel):
    file_id: str
    total_rows: int
    preview_rows: list[CSVPreviewRow]
    detected_columns: list[str]
    suggested_mapping: CSVColumnMapping


class ImportConfirmRequest(BaseModel):
    file_id: str
    column_mapping: CSVColumnMapping
    default_account_id: Optional[UUID] = None
    default_category_id: Optional[UUID] = None
    default_payer_member_id: UUID
    skip_duplicates: bool = True


class ImportConfirmResponse(BaseModel):
    imported_count: int
    skipped_count: int
    error_count: int
    errors: list[str]


# External Data Source Schemas
class ExternalDataSourceBase(BaseModel):
    type: str  # "google_sheet"
    sheet_id: str
    sheet_name: str = "Sheet1"
    account_id: Optional[UUID] = None
    column_mapping: dict = {}
    sync_direction: str = "import"  # "import" | "export" | "both"


class ExternalDataSourceCreate(ExternalDataSourceBase):
    pass


class ExternalDataSourceUpdate(BaseModel):
    sheet_name: Optional[str] = None
    account_id: Optional[UUID] = None
    column_mapping: Optional[dict] = None
    sync_direction: Optional[str] = None


class ExternalDataSourceResponse(ExternalDataSourceBase):
    id: UUID
    household_id: UUID
    created_by_user_id: UUID
    last_synced_at: Optional[datetime] = None
    last_synced_row: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SyncImportResponse(BaseModel):
    imported_count: int
    updated_count: int
    skipped_count: int
    last_synced_row: int


class SyncExportResponse(BaseModel):
    exported_count: int
    last_synced_row: int
