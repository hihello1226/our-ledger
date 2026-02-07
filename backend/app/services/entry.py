from uuid import UUID
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import extract, or_, func
from typing import Optional

from app.models import Entry, Category, HouseholdMember, Account
from app.schemas.entry import EntryCreate, EntryUpdate, EntrySummary


def get_date_range_from_preset(preset: str) -> tuple[date, date]:
    """Convert date preset to date range"""
    today = date.today()
    if preset == "today":
        return today, today
    elif preset == "this_week":
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        return start_of_week, end_of_week
    elif preset == "this_month":
        start_of_month = today.replace(day=1)
        # Get last day of month
        if today.month == 12:
            end_of_month = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end_of_month = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        return start_of_month, end_of_month
    return None, None


def determine_transfer_type(
    db: Session,
    household_id: UUID,
    transfer_from_account_id: UUID | None,
    transfer_to_account_id: UUID | None,
) -> str | None:
    """Determine transfer type based on account ownership"""
    if not transfer_from_account_id or not transfer_to_account_id:
        return None

    from_account = db.query(Account).filter(Account.id == transfer_from_account_id).first()
    to_account = db.query(Account).filter(Account.id == transfer_to_account_id).first()

    if not from_account or not to_account:
        return None

    # Check if accounts belong to household (shared account)
    from_is_household = from_account.household_id == household_id
    to_is_household = to_account.household_id == household_id

    # Internal transfer: both accounts belong to the same household or same owner
    if from_is_household and to_is_household:
        return "internal"
    if from_account.owner_user_id == to_account.owner_user_id:
        return "internal"

    # External transfer
    if from_is_household or (from_account.owner_user_id is not None):
        # Money going out from our account
        return "external_out"
    else:
        # Money coming in to our account
        return "external_in"


def calculate_summary(entries: list[Entry]) -> EntrySummary:
    """Calculate summary for a list of entries"""
    total_income = 0
    total_expense = 0
    total_transfer_in = 0
    total_transfer_out = 0

    for entry in entries:
        if entry.type == "income":
            total_income += entry.amount
        elif entry.type == "expense":
            total_expense += entry.amount
        elif entry.type == "transfer":
            if entry.transfer_type == "external_in":
                total_transfer_in += entry.amount
            elif entry.transfer_type == "external_out":
                total_transfer_out += entry.amount
            # internal transfers don't affect net balance

    net_balance = total_income + total_transfer_in - total_expense - total_transfer_out

    return EntrySummary(
        total_income=total_income,
        total_expense=total_expense,
        total_transfer_in=total_transfer_in,
        total_transfer_out=total_transfer_out,
        net_balance=net_balance,
    )


def calculate_running_balances(
    db: Session,
    entries: list[Entry],
    account_ids: list[UUID] | None = None,
) -> dict[UUID, int]:
    """
    Calculate running balance for each entry.
    Returns dict mapping entry_id -> balance_after
    Only calculates if single account filter is applied.
    """
    if not account_ids or len(account_ids) != 1:
        return {}

    account_id = account_ids[0]
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        return {}

    # Get initial balance
    initial_balance = account.balance or 0

    # Get ALL entries for this account, sorted by date asc
    all_entries = (
        db.query(Entry)
        .filter(
            or_(
                Entry.account_id == account_id,
                Entry.transfer_from_account_id == account_id,
                Entry.transfer_to_account_id == account_id,
            )
        )
        .order_by(Entry.occurred_at.asc().nullslast(), Entry.date.asc(), Entry.created_at.asc())
        .all()
    )

    # Calculate running balance
    balance = initial_balance
    balance_map = {}
    entry_ids_set = {e.id for e in entries}

    for entry in all_entries:
        # Calculate balance change for this account
        if entry.type == "income" and entry.account_id == account_id:
            balance += entry.amount
        elif entry.type == "expense" and entry.account_id == account_id:
            balance -= entry.amount
        elif entry.type == "transfer":
            if entry.transfer_from_account_id == account_id:
                balance -= entry.amount
            elif entry.transfer_to_account_id == account_id:
                balance += entry.amount

        # Store balance if this entry is in our filtered list
        if entry.id in entry_ids_set:
            balance_map[entry.id] = balance

    return balance_map


def get_entries(
    db: Session,
    household_id: UUID,
    month: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    date_preset: str | None = None,
    category_id: UUID | None = None,
    category_ids: list[UUID] | None = None,
    payer_member_id: UUID | None = None,
    shared: bool | None = None,
    entry_type: str | None = None,
    entry_types: list[str] | None = None,
    transfer_type: str | None = None,
    account_ids: list[UUID] | None = None,
    amount_min: int | None = None,
    amount_max: int | None = None,
    memo_search: str | None = None,
    sort_by: str = "occurred_at",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Entry], int, EntrySummary, dict[UUID, int]]:
    """Get entries with filtering and pagination. Returns (entries, total_count, summary, balance_map)."""
    query = db.query(Entry).filter(Entry.household_id == household_id)

    # Date preset takes priority over explicit date_from/date_to
    if date_preset:
        preset_from, preset_to = get_date_range_from_preset(date_preset)
        if preset_from:
            date_from = preset_from
        if preset_to:
            date_to = preset_to

    # Date range filter
    if date_from:
        query = query.filter(Entry.date >= date_from)
    if date_to:
        query = query.filter(Entry.date <= date_to)

    # Legacy month filter (if no date range specified)
    if month and not date_from and not date_to:
        year, mon = map(int, month.split("-"))
        query = query.filter(
            extract("year", Entry.date) == year,
            extract("month", Entry.date) == mon,
        )

    # Category filter (multi-select takes priority)
    if category_ids:
        query = query.filter(Entry.category_id.in_(category_ids))
    elif category_id:
        query = query.filter(Entry.category_id == category_id)

    if payer_member_id:
        query = query.filter(Entry.payer_member_id == payer_member_id)

    if shared is not None:
        query = query.filter(Entry.shared == shared)

    # Type filter (multi-select takes priority)
    if entry_types:
        query = query.filter(Entry.type.in_(entry_types))
    elif entry_type:
        query = query.filter(Entry.type == entry_type)

    if transfer_type:
        query = query.filter(Entry.transfer_type == transfer_type)

    if account_ids:
        # Filter by any of the account fields
        query = query.filter(
            or_(
                Entry.account_id.in_(account_ids),
                Entry.transfer_from_account_id.in_(account_ids),
                Entry.transfer_to_account_id.in_(account_ids),
            )
        )

    # Amount range filter
    if amount_min is not None:
        query = query.filter(Entry.amount >= amount_min)
    if amount_max is not None:
        query = query.filter(Entry.amount <= amount_max)

    # Memo search filter
    if memo_search:
        query = query.filter(Entry.memo.ilike(f"%{memo_search}%"))

    # Get total count before pagination
    total_count = query.count()

    # Get all filtered entries for summary calculation (without pagination)
    all_filtered_entries = query.all()
    summary = calculate_summary(all_filtered_entries)

    # Sorting
    if sort_by == "amount":
        sort_col = Entry.amount
    else:
        # Default to occurred_at, fallback to date then created_at
        sort_col = Entry.occurred_at

    if sort_order == "asc":
        query = query.order_by(sort_col.asc().nullslast(), Entry.date.asc(), Entry.created_at.asc())
    else:
        query = query.order_by(sort_col.desc().nullsfirst(), Entry.date.desc(), Entry.created_at.desc())

    # Pagination
    offset = (page - 1) * page_size
    entries = query.offset(offset).limit(page_size).all()

    # Calculate running balances (only for single account filter)
    balance_map = calculate_running_balances(db, entries, account_ids)

    return entries, total_count, summary, balance_map


def get_entry_by_id(db: Session, entry_id: UUID) -> Entry | None:
    return db.query(Entry).filter(Entry.id == entry_id).first()


def create_entry(
    db: Session,
    entry_data: EntryCreate,
    household_id: UUID,
    user_id: UUID,
) -> Entry:
    # Set occurred_at from date if not provided
    occurred_at = entry_data.occurred_at
    if occurred_at is None and entry_data.date:
        occurred_at = datetime.combine(entry_data.date, datetime.min.time())

    # Determine transfer_type if not provided and it's a transfer
    transfer_type = entry_data.transfer_type
    if entry_data.type == "transfer" and not transfer_type:
        transfer_type = determine_transfer_type(
            db,
            household_id,
            entry_data.transfer_from_account_id,
            entry_data.transfer_to_account_id,
        )

    entry = Entry(
        household_id=household_id,
        created_by_user_id=user_id,
        type=entry_data.type,
        transfer_type=transfer_type,
        amount=entry_data.amount,
        date=entry_data.date,
        occurred_at=occurred_at,
        category_id=entry_data.category_id,
        memo=entry_data.memo,
        payer_member_id=entry_data.payer_member_id,
        shared=entry_data.shared,
        account_id=entry_data.account_id,
        transfer_from_account_id=entry_data.transfer_from_account_id,
        transfer_to_account_id=entry_data.transfer_to_account_id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_entry(db: Session, entry: Entry, entry_data: EntryUpdate) -> Entry:
    update_data = entry_data.model_dump(exclude_unset=True)

    # Handle occurred_at update from date if date is updated but occurred_at is not
    if "date" in update_data and "occurred_at" not in update_data:
        update_data["occurred_at"] = datetime.combine(
            update_data["date"], datetime.min.time()
        )

    for field, value in update_data.items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


def delete_entry(db: Session, entry: Entry) -> None:
    db.delete(entry)
    db.commit()


def get_categories(db: Session, household_id: UUID | None = None) -> list[Category]:
    return (
        db.query(Category)
        .filter(
            (Category.household_id == None) | (Category.household_id == household_id)
        )
        .order_by(Category.type, Category.sort_order)
        .all()
    )
