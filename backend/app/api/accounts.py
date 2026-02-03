from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse
from app.services.auth import get_current_user
from app.services.household import get_user_household
from app.services.account import (
    get_accessible_accounts,
    get_account_by_id,
    validate_account_access,
    create_account,
    update_account,
    delete_account,
)
from app.models import User

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


def get_account_response(account) -> AccountResponse:
    return AccountResponse(
        id=account.id,
        owner_user_id=account.owner_user_id,
        household_id=account.household_id,
        name=account.name,
        bank_name=account.bank_name,
        type=account.type,
        balance=account.balance,
        is_shared_visible=account.is_shared_visible,
        created_at=account.created_at,
        updated_at=account.updated_at,
        owner_name=account.owner_user.name if account.owner_user else None,
    )


@router.get("", response_model=list[AccountResponse])
def list_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all accessible accounts (own + shared visible in household)"""
    household = get_user_household(db, current_user.id)
    household_id = household.id if household else None

    accounts = get_accessible_accounts(db, current_user.id, household_id)
    return [get_account_response(a) for a in accounts]


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_new_account(
    account_data: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new account"""
    # If household_id is provided, verify user belongs to that household
    if account_data.household_id:
        household = get_user_household(db, current_user.id)
        if not household or household.id != account_data.household_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't belong to this household",
            )

    # Validate type
    if account_data.type not in ("personal", "shared"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account type must be 'personal' or 'shared'",
        )

    account = create_account(db, account_data, current_user.id)
    return get_account_response(account)


@router.get("/{account_id}", response_model=AccountResponse)
def get_single_account(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single account by ID"""
    household = get_user_household(db, current_user.id)
    household_id = household.id if household else None

    account = get_account_by_id(db, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    if not validate_account_access(db, account, current_user.id, household_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this account",
        )

    return get_account_response(account)


@router.patch("/{account_id}", response_model=AccountResponse)
def update_existing_account(
    account_id: UUID,
    account_data: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an account (owner only)"""
    household = get_user_household(db, current_user.id)
    household_id = household.id if household else None

    account = get_account_by_id(db, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    if not validate_account_access(
        db, account, current_user.id, household_id, require_ownership=True
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own accounts",
        )

    # Validate type if provided
    if account_data.type and account_data.type not in ("personal", "shared"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account type must be 'personal' or 'shared'",
        )

    account = update_account(db, account, account_data)
    return get_account_response(account)


@router.delete("/{account_id}")
def delete_existing_account(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an account (owner only)"""
    household = get_user_household(db, current_user.id)
    household_id = household.id if household else None

    account = get_account_by_id(db, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    if not validate_account_access(
        db, account, current_user.id, household_id, require_ownership=True
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own accounts",
        )

    delete_account(db, account)
    return {"message": "Account deleted"}
