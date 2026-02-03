import hashlib
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import (
    ExternalDataSource,
    EntryExternalRef,
    Entry,
    Category,
)
from app.schemas.external_source import (
    ExternalDataSourceCreate,
    ExternalDataSourceUpdate,
    SyncImportResponse,
    SyncExportResponse,
)
from app.core.config import settings


def get_sheets_client():
    """
    Get Google Sheets API client using service account credentials.
    Returns None if credentials are not configured.
    """
    if not settings.GOOGLE_SERVICE_ACCOUNT_FILE:
        return None

    try:
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build

        SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
        credentials = Credentials.from_service_account_file(
            settings.GOOGLE_SERVICE_ACCOUNT_FILE,
            scopes=SCOPES,
        )
        service = build("sheets", "v4", credentials=credentials)
        return service.spreadsheets()
    except Exception as e:
        print(f"Failed to initialize Google Sheets client: {e}")
        return None


def read_sheet_data(
    sheet_id: str,
    sheet_name: str,
    start_row: int = 2,  # Skip header row
    max_rows: int = 1000,
) -> tuple[list[list[str]], int]:
    """
    Read data from Google Sheet.
    Returns (rows, last_row_number)
    """
    client = get_sheets_client()
    if not client:
        raise ValueError("Google Sheets is not configured")

    range_name = f"'{sheet_name}'!A{start_row}:Z{start_row + max_rows - 1}"

    try:
        result = client.values().get(
            spreadsheetId=sheet_id,
            range=range_name,
        ).execute()

        values = result.get("values", [])
        last_row = start_row + len(values) - 1 if values else start_row - 1

        return values, last_row
    except Exception as e:
        raise ValueError(f"Failed to read sheet: {e}")


def write_sheet_data(
    sheet_id: str,
    sheet_name: str,
    data: list[list[str]],
    start_row: int = 2,
) -> int:
    """
    Write data to Google Sheet.
    Returns number of rows written.
    """
    client = get_sheets_client()
    if not client:
        raise ValueError("Google Sheets is not configured")

    if not data:
        return 0

    range_name = f"'{sheet_name}'!A{start_row}"

    try:
        result = client.values().update(
            spreadsheetId=sheet_id,
            range=range_name,
            valueInputOption="USER_ENTERED",
            body={"values": data},
        ).execute()

        return result.get("updatedRows", 0)
    except Exception as e:
        raise ValueError(f"Failed to write to sheet: {e}")


def get_external_sources(
    db: Session,
    household_id: UUID,
) -> list[ExternalDataSource]:
    """Get all external data sources for a household"""
    return (
        db.query(ExternalDataSource)
        .filter(ExternalDataSource.household_id == household_id)
        .order_by(ExternalDataSource.created_at.desc())
        .all()
    )


def get_external_source_by_id(
    db: Session,
    source_id: UUID,
) -> ExternalDataSource | None:
    """Get external data source by ID"""
    return db.query(ExternalDataSource).filter(
        ExternalDataSource.id == source_id
    ).first()


def create_external_source(
    db: Session,
    source_data: ExternalDataSourceCreate,
    household_id: UUID,
    user_id: UUID,
) -> ExternalDataSource:
    """Create a new external data source"""
    source = ExternalDataSource(
        household_id=household_id,
        created_by_user_id=user_id,
        type=source_data.type,
        sheet_id=source_data.sheet_id,
        sheet_name=source_data.sheet_name,
        account_id=source_data.account_id,
        column_mapping=source_data.column_mapping,
        sync_direction=source_data.sync_direction,
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


def update_external_source(
    db: Session,
    source: ExternalDataSource,
    source_data: ExternalDataSourceUpdate,
) -> ExternalDataSource:
    """Update an external data source"""
    update_data = source_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(source, field, value)
    db.commit()
    db.refresh(source)
    return source


def delete_external_source(db: Session, source: ExternalDataSource) -> None:
    """Delete an external data source"""
    db.delete(source)
    db.commit()


def generate_row_hash(row: list[str]) -> str:
    """Generate hash for a row to detect changes"""
    return hashlib.md5("|".join(row).encode()).hexdigest()


def sync_import(
    db: Session,
    source: ExternalDataSource,
    payer_member_id: UUID,
) -> SyncImportResponse:
    """
    Import data from Google Sheet to entries.
    Only imports new rows since last sync.
    """
    start_row = (source.last_synced_row or 1) + 1
    rows, last_row = read_sheet_data(
        source.sheet_id,
        source.sheet_name,
        start_row=start_row,
    )

    if not rows:
        return SyncImportResponse(
            imported_count=0,
            updated_count=0,
            skipped_count=0,
            last_synced_row=source.last_synced_row or 0,
        )

    column_mapping = source.column_mapping or {}
    date_col = column_mapping.get("date", 0)
    amount_col = column_mapping.get("amount", 1)
    type_col = column_mapping.get("type", 2)
    category_col = column_mapping.get("category", 3)
    memo_col = column_mapping.get("memo", 4)

    # Get categories for matching
    categories = db.query(Category).filter(
        (Category.household_id == None) | (Category.household_id == source.household_id)
    ).all()
    category_map = {c.name.lower(): c.id for c in categories}

    imported_count = 0
    updated_count = 0
    skipped_count = 0

    for i, row in enumerate(rows):
        row_number = start_row + i
        external_row_id = str(row_number)
        row_hash = generate_row_hash(row)

        # Check if row already imported
        existing_ref = (
            db.query(EntryExternalRef)
            .filter(
                EntryExternalRef.source_id == source.id,
                EntryExternalRef.external_row_id == external_row_id,
            )
            .first()
        )

        if existing_ref:
            if existing_ref.external_hash == row_hash:
                # No changes
                skipped_count += 1
                continue
            else:
                # Row updated - update entry
                # TODO: Implement update logic
                skipped_count += 1
                continue

        # Parse row data
        try:
            date_str = row[date_col] if len(row) > date_col else ""
            amount_str = row[amount_col] if len(row) > amount_col else ""
            type_str = row[type_col] if len(row) > type_col else "expense"
            category_str = row[category_col] if len(row) > category_col else ""
            memo_str = row[memo_col] if len(row) > memo_col else ""

            # Parse date
            from app.services.csv_import import parse_date, parse_amount
            parsed_date = parse_date(date_str)
            parsed_amount = parse_amount(amount_str)

            if not parsed_date or parsed_amount is None:
                skipped_count += 1
                continue

            # Determine type
            entry_type = "expense"
            type_lower = type_str.lower()
            if "income" in type_lower or "수입" in type_lower:
                entry_type = "income"
            elif "transfer" in type_lower or "이체" in type_lower:
                entry_type = "transfer"

            # Find category
            category_id = None
            if category_str:
                category_id = category_map.get(category_str.lower().strip())

            # Create entry
            entry = Entry(
                household_id=source.household_id,
                created_by_user_id=source.created_by_user_id,
                type=entry_type,
                amount=abs(parsed_amount),
                date=parsed_date,
                occurred_at=datetime.combine(parsed_date, datetime.min.time()),
                category_id=category_id,
                memo=memo_str if memo_str else None,
                payer_member_id=payer_member_id,
                shared=False,
                account_id=source.account_id,
            )
            db.add(entry)
            db.flush()  # Get entry.id

            # Create external ref
            ref = EntryExternalRef(
                entry_id=entry.id,
                source_id=source.id,
                external_row_id=external_row_id,
                external_hash=row_hash,
            )
            db.add(ref)

            imported_count += 1

        except Exception as e:
            skipped_count += 1
            continue

    # Update last synced info
    source.last_synced_at = datetime.utcnow()
    source.last_synced_row = last_row

    db.commit()

    return SyncImportResponse(
        imported_count=imported_count,
        updated_count=updated_count,
        skipped_count=skipped_count,
        last_synced_row=last_row,
    )


def sync_export(
    db: Session,
    source: ExternalDataSource,
) -> SyncExportResponse:
    """
    Export entries to Google Sheet.
    Only exports entries not yet exported.
    """
    # Get entries without external refs for this source
    exported_entry_ids = (
        db.query(EntryExternalRef.entry_id)
        .filter(EntryExternalRef.source_id == source.id)
        .subquery()
    )

    entries_query = db.query(Entry).filter(
        Entry.household_id == source.household_id,
        ~Entry.id.in_(exported_entry_ids),
    )

    if source.account_id:
        entries_query = entries_query.filter(Entry.account_id == source.account_id)

    entries = entries_query.order_by(Entry.date, Entry.created_at).limit(1000).all()

    if not entries:
        return SyncExportResponse(
            exported_count=0,
            last_synced_row=source.last_synced_row or 0,
        )

    # Prepare data for export
    column_mapping = source.column_mapping or {}
    data = []

    for entry in entries:
        row = [
            entry.date.strftime("%Y-%m-%d"),
            str(entry.amount),
            entry.type,
            entry.category.name if entry.category else "",
            entry.memo or "",
        ]
        data.append(row)

    # Determine start row
    start_row = (source.last_synced_row or 1) + 1

    # Write to sheet
    written = write_sheet_data(
        source.sheet_id,
        source.sheet_name,
        data,
        start_row=start_row,
    )

    # Create external refs
    for i, entry in enumerate(entries[:written] if written else entries):
        row_number = start_row + i
        ref = EntryExternalRef(
            entry_id=entry.id,
            source_id=source.id,
            external_row_id=str(row_number),
            external_hash=generate_row_hash(data[i]),
        )
        db.add(ref)

    # Update last synced info
    source.last_synced_at = datetime.utcnow()
    source.last_synced_row = start_row + len(entries) - 1

    db.commit()

    return SyncExportResponse(
        exported_count=len(entries),
        last_synced_row=source.last_synced_row,
    )
