from uuid import UUID
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import extract

from app.models import Entry, Category, HouseholdMember
from app.schemas import EntryCreate, EntryUpdate


def get_entries(
    db: Session,
    household_id: UUID,
    month: str | None = None,
    category_id: UUID | None = None,
    payer_member_id: UUID | None = None,
    shared: bool | None = None,
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

    return query.order_by(Entry.date.desc(), Entry.created_at.desc()).all()


def get_entry_by_id(db: Session, entry_id: UUID) -> Entry | None:
    return db.query(Entry).filter(Entry.id == entry_id).first()


def create_entry(
    db: Session,
    entry_data: EntryCreate,
    household_id: UUID,
    user_id: UUID,
) -> Entry:
    entry = Entry(
        household_id=household_id,
        created_by_user_id=user_id,
        type=entry_data.type,
        amount=entry_data.amount,
        date=entry_data.date,
        category_id=entry_data.category_id,
        memo=entry_data.memo,
        payer_member_id=entry_data.payer_member_id,
        shared=entry_data.shared,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_entry(db: Session, entry: Entry, entry_data: EntryUpdate) -> Entry:
    update_data = entry_data.model_dump(exclude_unset=True)
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
