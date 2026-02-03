import csv
import hashlib
import io
import uuid
from datetime import datetime, date
from typing import Optional
from sqlalchemy.orm import Session

from app.models import Entry, Category, Account
from app.schemas.external_source import (
    CSVColumnMapping,
    CSVPreviewRow,
    CSVUploadResponse,
    ImportConfirmResponse,
)

# In-memory storage for uploaded CSV files (in production, use Redis or file storage)
_csv_cache: dict[str, dict] = {}


def parse_csv(file_content: bytes, encoding: str = "utf-8") -> tuple[list[str], list[dict]]:
    """Parse CSV content and return headers and rows"""
    try:
        content = file_content.decode(encoding)
    except UnicodeDecodeError:
        # Try other encodings
        for enc in ["cp949", "euc-kr", "utf-8-sig"]:
            try:
                content = file_content.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        else:
            raise ValueError("Unable to decode CSV file")

    reader = csv.DictReader(io.StringIO(content))
    headers = reader.fieldnames or []
    rows = list(reader)

    return headers, rows


def detect_column_mapping(headers: list[str]) -> CSVColumnMapping:
    """Detect column mapping based on header names"""
    mapping = CSVColumnMapping()

    # Common Korean column names
    date_names = ["날짜", "거래일", "일자", "date"]
    amount_names = ["금액", "거래금액", "amount"]
    type_names = ["유형", "거래유형", "type", "분류"]
    category_names = ["카테고리", "분류", "category"]
    memo_names = ["메모", "비고", "적요", "memo", "내용"]
    account_names = ["계좌", "통장", "account"]

    for header in headers:
        header_lower = header.lower().strip()
        if any(name in header_lower for name in date_names):
            mapping.date = header
        elif any(name in header_lower for name in amount_names):
            mapping.amount = header
        elif any(name in header_lower for name in type_names):
            mapping.type = header
        elif any(name in header_lower for name in category_names):
            mapping.category = header
        elif any(name in header_lower for name in memo_names):
            mapping.memo = header
        elif any(name in header_lower for name in account_names):
            mapping.account = header

    return mapping


def parse_date(date_str: str) -> Optional[date]:
    """Parse date string to date object"""
    formats = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%Y.%m.%d",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%Y년 %m월 %d일",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue

    return None


def parse_amount(amount_str: str) -> Optional[int]:
    """Parse amount string to integer"""
    # Remove currency symbols, commas, spaces
    cleaned = amount_str.replace(",", "").replace(" ", "").replace("원", "")
    cleaned = cleaned.replace("₩", "").replace("$", "")

    try:
        # Handle negative amounts
        if cleaned.startswith("(") and cleaned.endswith(")"):
            cleaned = "-" + cleaned[1:-1]
        return int(float(cleaned))
    except ValueError:
        return None


def generate_row_hash(row: dict, columns: list[str]) -> str:
    """Generate a hash for duplicate detection"""
    values = [str(row.get(col, "")) for col in sorted(columns)]
    return hashlib.md5("|".join(values).encode()).hexdigest()


def preview_import(
    db: Session,
    file_content: bytes,
    household_id: uuid.UUID,
    encoding: str = "utf-8",
) -> CSVUploadResponse:
    """Parse CSV and generate preview"""
    headers, rows = parse_csv(file_content, encoding)
    mapping = detect_column_mapping(headers)

    # Generate file ID and cache
    file_id = str(uuid.uuid4())
    _csv_cache[file_id] = {
        "headers": headers,
        "rows": rows,
        "household_id": str(household_id),
        "created_at": datetime.utcnow(),
    }

    # Generate preview rows (first 10)
    preview_rows = []
    for i, row in enumerate(rows[:10]):
        date_str = row.get(mapping.date, "")
        amount_str = row.get(mapping.amount, "")

        parsed_date = parse_date(date_str)
        parsed_amount = parse_amount(amount_str)

        error = None
        if not parsed_date:
            error = f"Invalid date: {date_str}"
        elif parsed_amount is None:
            error = f"Invalid amount: {amount_str}"

        # Determine type
        entry_type = "expense"
        if mapping.type and row.get(mapping.type):
            type_value = row.get(mapping.type, "").lower()
            if "income" in type_value or "수입" in type_value:
                entry_type = "income"
            elif "transfer" in type_value or "이체" in type_value:
                entry_type = "transfer"
        elif parsed_amount and parsed_amount > 0:
            # Positive might be income depending on bank format
            entry_type = "expense"  # Default to expense, user can adjust

        preview_rows.append(
            CSVPreviewRow(
                row_number=i + 1,
                date=date_str,
                amount=abs(parsed_amount) if parsed_amount else 0,
                type=entry_type,
                category=row.get(mapping.category) if mapping.category else None,
                memo=row.get(mapping.memo) if mapping.memo else None,
                account=row.get(mapping.account) if mapping.account else None,
                is_duplicate=False,  # Will be checked during confirm
                error=error,
            )
        )

    return CSVUploadResponse(
        file_id=file_id,
        total_rows=len(rows),
        preview_rows=preview_rows,
        detected_columns=headers,
        suggested_mapping=mapping,
    )


def execute_import(
    db: Session,
    file_id: str,
    household_id: uuid.UUID,
    user_id: uuid.UUID,
    column_mapping: CSVColumnMapping,
    default_account_id: Optional[uuid.UUID],
    default_payer_member_id: uuid.UUID,
    skip_duplicates: bool = True,
) -> ImportConfirmResponse:
    """Execute the import from cached CSV data"""
    cached = _csv_cache.get(file_id)
    if not cached:
        return ImportConfirmResponse(
            imported_count=0,
            skipped_count=0,
            error_count=0,
            errors=["File not found. Please upload again."],
        )

    if str(household_id) != cached["household_id"]:
        return ImportConfirmResponse(
            imported_count=0,
            skipped_count=0,
            error_count=0,
            errors=["Invalid file ID."],
        )

    rows = cached["rows"]
    imported_count = 0
    skipped_count = 0
    error_count = 0
    errors = []

    # Get existing entry hashes for duplicate detection
    existing_hashes = set()
    if skip_duplicates:
        existing_entries = db.query(Entry).filter(
            Entry.household_id == household_id
        ).all()
        for entry in existing_entries:
            hash_str = f"{entry.date}|{entry.amount}|{entry.memo or ''}"
            existing_hashes.add(hashlib.md5(hash_str.encode()).hexdigest())

    # Get categories for matching
    categories = db.query(Category).filter(
        (Category.household_id == None) | (Category.household_id == household_id)
    ).all()
    category_map = {c.name.lower(): c.id for c in categories}

    for i, row in enumerate(rows):
        try:
            date_str = row.get(column_mapping.date, "")
            amount_str = row.get(column_mapping.amount, "")

            parsed_date = parse_date(date_str)
            parsed_amount = parse_amount(amount_str)

            if not parsed_date:
                error_count += 1
                errors.append(f"Row {i+1}: Invalid date '{date_str}'")
                continue

            if parsed_amount is None:
                error_count += 1
                errors.append(f"Row {i+1}: Invalid amount '{amount_str}'")
                continue

            # Determine type
            entry_type = "expense"
            if column_mapping.type and row.get(column_mapping.type):
                type_value = row.get(column_mapping.type, "").lower()
                if "income" in type_value or "수입" in type_value:
                    entry_type = "income"
                elif "transfer" in type_value or "이체" in type_value:
                    entry_type = "transfer"

            memo = row.get(column_mapping.memo) if column_mapping.memo else None

            # Check for duplicates
            if skip_duplicates:
                hash_str = f"{parsed_date}|{abs(parsed_amount)}|{memo or ''}"
                row_hash = hashlib.md5(hash_str.encode()).hexdigest()
                if row_hash in existing_hashes:
                    skipped_count += 1
                    continue
                existing_hashes.add(row_hash)

            # Find category
            category_id = None
            if column_mapping.category and row.get(column_mapping.category):
                category_name = row.get(column_mapping.category, "").lower().strip()
                category_id = category_map.get(category_name)

            # Create entry
            entry = Entry(
                household_id=household_id,
                created_by_user_id=user_id,
                type=entry_type,
                amount=abs(parsed_amount),
                date=parsed_date,
                occurred_at=datetime.combine(parsed_date, datetime.min.time()),
                category_id=category_id,
                memo=memo,
                payer_member_id=default_payer_member_id,
                shared=False,
                account_id=default_account_id,
            )
            db.add(entry)
            imported_count += 1

        except Exception as e:
            error_count += 1
            errors.append(f"Row {i+1}: {str(e)}")

    db.commit()

    # Clean up cache
    del _csv_cache[file_id]

    return ImportConfirmResponse(
        imported_count=imported_count,
        skipped_count=skipped_count,
        error_count=error_count,
        errors=errors[:20],  # Limit error messages
    )


def check_duplicates(
    db: Session,
    household_id: uuid.UUID,
    entries: list[dict],
) -> list[bool]:
    """Check which entries are duplicates"""
    existing_entries = db.query(Entry).filter(
        Entry.household_id == household_id
    ).all()

    existing_hashes = set()
    for entry in existing_entries:
        hash_str = f"{entry.date}|{entry.amount}|{entry.memo or ''}"
        existing_hashes.add(hashlib.md5(hash_str.encode()).hexdigest())

    results = []
    for entry_data in entries:
        hash_str = f"{entry_data.get('date')}|{entry_data.get('amount')}|{entry_data.get('memo', '')}"
        row_hash = hashlib.md5(hash_str.encode()).hexdigest()
        results.append(row_hash in existing_hashes)

    return results
