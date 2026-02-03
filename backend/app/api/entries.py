from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas import EntryCreate, EntryUpdate, EntryResponse, CategoryResponse
from app.services.auth import get_current_user
from app.services.household import get_user_household
from app.services.entry import (
    get_entries,
    get_entry_by_id,
    create_entry,
    update_entry,
    delete_entry,
    get_categories,
)
from app.models import User

router = APIRouter(prefix="/api/entries", tags=["entries"])


def get_entry_response(entry) -> EntryResponse:
    return EntryResponse(
        id=entry.id,
        household_id=entry.household_id,
        created_by_user_id=entry.created_by_user_id,
        type=entry.type,
        amount=entry.amount,
        date=entry.date,
        category_id=entry.category_id,
        memo=entry.memo,
        payer_member_id=entry.payer_member_id,
        shared=entry.shared,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        category_name=entry.category.name if entry.category else None,
        payer_name=entry.payer_member.user.name if entry.payer_member else None,
    )


@router.get("", response_model=list[EntryResponse])
def list_entries(
    month: str | None = Query(None, description="YYYY-MM format"),
    category_id: UUID | None = None,
    payer_member_id: UUID | None = None,
    shared: bool | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    entries = get_entries(
        db,
        household.id,
        month=month,
        category_id=category_id,
        payer_member_id=payer_member_id,
        shared=shared,
    )
    return [get_entry_response(e) for e in entries]


@router.post("", response_model=EntryResponse)
def create_new_entry(
    entry_data: EntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    entry = create_entry(db, entry_data, household.id, current_user.id)
    return get_entry_response(entry)


@router.get("/categories", response_model=list[CategoryResponse])
def list_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    household = get_user_household(db, current_user.id)
    household_id = household.id if household else None
    categories = get_categories(db, household_id)
    return categories


@router.get("/{entry_id}", response_model=EntryResponse)
def get_single_entry(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    entry = get_entry_by_id(db, entry_id)
    if not entry or entry.household_id != household.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entry not found",
        )

    return get_entry_response(entry)


@router.put("/{entry_id}", response_model=EntryResponse)
def update_existing_entry(
    entry_id: UUID,
    entry_data: EntryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    entry = get_entry_by_id(db, entry_id)
    if not entry or entry.household_id != household.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entry not found",
        )

    entry = update_entry(db, entry, entry_data)
    return get_entry_response(entry)


@router.delete("/{entry_id}")
def delete_existing_entry(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    entry = get_entry_by_id(db, entry_id)
    if not entry or entry.household_id != household.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entry not found",
        )

    delete_entry(db, entry)
    return {"message": "Entry deleted"}
