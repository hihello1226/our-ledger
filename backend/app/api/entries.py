from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.schemas.entry import EntryCreate, EntryUpdate, EntryResponse
from app.schemas.category import CategoryResponse
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
        occurred_at=entry.occurred_at,
        category_id=entry.category_id,
        memo=entry.memo,
        payer_member_id=entry.payer_member_id,
        shared=entry.shared,
        account_id=entry.account_id,
        transfer_from_account_id=entry.transfer_from_account_id,
        transfer_to_account_id=entry.transfer_to_account_id,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        category_name=entry.category.name if entry.category else None,
        payer_name=entry.payer_member.user.name if entry.payer_member else None,
        account_name=entry.account.name if entry.account else None,
        transfer_from_account_name=(
            entry.transfer_from_account.name if entry.transfer_from_account else None
        ),
        transfer_to_account_name=(
            entry.transfer_to_account.name if entry.transfer_to_account else None
        ),
    )


@router.get("", response_model=list[EntryResponse])
def list_entries(
    month: str | None = Query(None, description="YYYY-MM format"),
    category_id: UUID | None = None,
    payer_member_id: UUID | None = None,
    shared: bool | None = None,
    type: str | None = Query(None, description="expense | income | transfer"),
    account_ids: str | None = Query(None, description="Comma-separated UUIDs"),
    sort_by: str = Query("occurred_at", description="occurred_at | amount"),
    sort_order: str = Query("desc", description="asc | desc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    # Parse account_ids
    parsed_account_ids = None
    if account_ids:
        try:
            parsed_account_ids = [UUID(aid.strip()) for aid in account_ids.split(",")]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid account_ids format",
            )

    # Validate type
    if type and type not in ("expense", "income", "transfer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Type must be 'expense', 'income', or 'transfer'",
        )

    # Validate sort_by
    if sort_by not in ("occurred_at", "amount"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sort_by must be 'occurred_at' or 'amount'",
        )

    # Validate sort_order
    if sort_order not in ("asc", "desc"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sort_order must be 'asc' or 'desc'",
        )

    entries = get_entries(
        db,
        household.id,
        month=month,
        category_id=category_id,
        payer_member_id=payer_member_id,
        shared=shared,
        entry_type=type,
        account_ids=parsed_account_ids,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return [get_entry_response(e) for e in entries]


@router.post("", response_model=EntryResponse, status_code=status.HTTP_201_CREATED)
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

    # Validate type
    if entry_data.type not in ("expense", "income", "transfer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Type must be 'expense', 'income', or 'transfer'",
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

    # Validate type if provided
    if entry_data.type and entry_data.type not in ("expense", "income", "transfer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Type must be 'expense', 'income', or 'transfer'",
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
