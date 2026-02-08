from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from typing import Optional
import math

from app.core.database import get_db
from app.schemas.entry import EntryCreate, EntryUpdate, EntryResponse, EntryListResponse
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
from app.models import User, Entry

router = APIRouter(prefix="/api/entries", tags=["entries"])


def get_entry_response(entry, balance_after: int | None = None) -> EntryResponse:
    return EntryResponse(
        id=entry.id,
        household_id=entry.household_id,
        created_by_user_id=entry.created_by_user_id,
        type=entry.type,
        transfer_type=entry.transfer_type,
        amount=entry.amount,
        date=entry.date,
        occurred_at=entry.occurred_at,
        category_id=entry.category_id,
        category_name=entry.category.name if entry.category else None,
        subcategory_id=entry.subcategory_id,
        subcategory_name=entry.subcategory_rel.name if entry.subcategory_rel else None,
        memo=entry.memo,
        payer_member_id=entry.payer_member_id,
        shared=entry.shared,
        account_id=entry.account_id,
        transfer_from_account_id=entry.transfer_from_account_id,
        transfer_to_account_id=entry.transfer_to_account_id,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        payer_name=entry.payer_member.user.name if entry.payer_member else None,
        account_name=entry.account.name if entry.account else None,
        transfer_from_account_name=(
            entry.transfer_from_account.name if entry.transfer_from_account else None
        ),
        transfer_to_account_name=(
            entry.transfer_to_account.name if entry.transfer_to_account else None
        ),
        balance_after=balance_after,
    )


@router.get("", response_model=EntryListResponse)
def list_entries(
    month: str | None = Query(None, description="YYYY-MM format"),
    date_from: date | None = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: date | None = Query(None, description="End date (YYYY-MM-DD)"),
    date_preset: str | None = Query(None, description="today | this_week | this_month"),
    category_id: UUID | None = None,
    category_ids: str | None = Query(None, description="Comma-separated category UUIDs"),
    payer_member_id: UUID | None = None,
    shared: bool | None = None,
    type: str | None = Query(None, description="expense | income | transfer"),
    types: str | None = Query(None, description="Comma-separated types: expense,income,transfer"),
    transfer_type: str | None = Query(None, description="internal | external_out | external_in"),
    account_ids: str | None = Query(None, description="Comma-separated account UUIDs"),
    amount_min: int | None = Query(None, description="Minimum amount"),
    amount_max: int | None = Query(None, description="Maximum amount"),
    memo_search: str | None = Query(None, description="Search memo text"),
    sort_by: str = Query("occurred_at", description="occurred_at | amount"),
    sort_order: str = Query("desc", description="asc | desc"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
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

    # Parse category_ids (supports 'uncategorized' as special value)
    parsed_category_ids = None
    include_uncategorized = False
    if category_ids:
        parsed_category_ids = []
        for cid in category_ids.split(","):
            cid = cid.strip()
            if cid == "uncategorized":
                include_uncategorized = True
            else:
                try:
                    parsed_category_ids.append(UUID(cid))
                except ValueError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid category_ids format",
                    )
        # 'uncategorized'만 선택된 경우 빈 리스트가 될 수 있음
        if not parsed_category_ids:
            parsed_category_ids = None

    # Parse types (multi-select)
    parsed_types = None
    if types:
        parsed_types = [t.strip() for t in types.split(",")]
        for t in parsed_types:
            if t not in ("expense", "income", "transfer"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Types must be 'expense', 'income', or 'transfer'",
                )

    # Validate type (single)
    if type and type not in ("expense", "income", "transfer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Type must be 'expense', 'income', or 'transfer'",
        )

    # Validate transfer_type
    if transfer_type and transfer_type not in ("internal", "external_out", "external_in"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="transfer_type must be 'internal', 'external_out', or 'external_in'",
        )

    # Validate date_preset
    if date_preset and date_preset not in ("today", "this_week", "this_month"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_preset must be 'today', 'this_week', or 'this_month'",
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

    entries, total_count, summary, balance_map = get_entries(
        db,
        household.id,
        current_user_id=current_user.id,
        month=month,
        date_from=date_from,
        date_to=date_to,
        date_preset=date_preset,
        category_id=category_id,
        category_ids=parsed_category_ids,
        include_uncategorized=include_uncategorized,
        payer_member_id=payer_member_id,
        shared=shared,
        entry_type=type,
        entry_types=parsed_types,
        transfer_type=transfer_type,
        account_ids=parsed_account_ids,
        amount_min=amount_min,
        amount_max=amount_max,
        memo_search=memo_search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1

    return EntryListResponse(
        entries=[get_entry_response(e, balance_map.get(e.id)) for e in entries],
        total_count=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
        summary=summary,
    )


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


@router.delete("/bulk")
def bulk_delete_entries(
    entry_ids: list[UUID] = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """여러 거래 일괄 삭제"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    # 모든 entry가 해당 household에 속하는지 확인
    entries = db.query(Entry).filter(
        Entry.id.in_(entry_ids),
        Entry.household_id == household.id,
    ).all()

    deleted_count = 0
    for entry in entries:
        db.delete(entry)
        deleted_count += 1

    db.commit()
    return {"deleted_count": deleted_count, "message": f"{deleted_count}개 삭제됨"}


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
