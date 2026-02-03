from uuid import UUID
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import extract, or_

from app.models import Entry, Category, HouseholdMember
from app.schemas.entry import EntryCreate, EntryUpdate


def get_entries(
    db: Session,
    household_id: UUID,
    month: str | None = None,
    category_id: UUID | None = None,
    payer_member_id: UUID | None = None,
    shared: bool | None = None,
    entry_type: str | None = None,
    account_ids: list[UUID] | None = None,
    sort_by: str = "occurred_at",
    sort_order: str = "desc",
) -> list[Entry]:
    query = db.query(Entry).filter(Entry.household_id == household_id)

    if month:
        year, mon = map(int, month.split("-"))
        query = query.filter(
            extract("year", Entry.date) == year,
            extract("month", Entry.date) == mon,
        )

    if category_id:
        query = query.filter(Entry.category_id == category_id)

    if payer_member_id:
        query = query.filter(Entry.payer_member_id == payer_member_id)

    if shared is not None:
        query = query.filter(Entry.shared == shared)

    if entry_type:
        query = query.filter(Entry.type == entry_type)

    if account_ids:
        # Filter by any of the account fields
        query = query.filter(
            or_(
                Entry.account_id.in_(account_ids),
                Entry.transfer_from_account_id.in_(account_ids),
                Entry.transfer_to_account_id.in_(account_ids),
            )
        )

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

    return query.all()


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

    entry = Entry(
        household_id=household_id,
        created_by_user_id=user_id,
        type=entry_data.type,
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
