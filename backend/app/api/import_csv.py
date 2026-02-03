from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.schemas.external_source import (
    CSVUploadResponse,
    ImportConfirmRequest,
    ImportConfirmResponse,
)
from app.services.auth import get_current_user
from app.services.household import get_user_household, get_member_by_user_and_household
from app.services.csv_import import preview_import, execute_import
from app.models import User

router = APIRouter(prefix="/api/import/csv", tags=["import"])


@router.post("/upload", response_model=CSVUploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    encoding: str = Form(default="utf-8"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload CSV file and get preview with column detection"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are allowed",
        )

    # Read file content
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit",
        )

    try:
        result = preview_import(db, content, household.id, encoding)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/confirm", response_model=ImportConfirmResponse)
def confirm_import(
    request: ImportConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirm and execute the CSV import"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    # Validate payer_member_id belongs to household
    member = get_member_by_user_and_household(db, request.default_payer_member_id, household.id)
    # Note: payer_member_id is the member ID, not user ID, so we need to verify it exists
    from app.models import HouseholdMember
    member = db.query(HouseholdMember).filter(
        HouseholdMember.id == request.default_payer_member_id,
        HouseholdMember.household_id == household.id,
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payer_member_id",
        )

    # Validate account_id if provided
    if request.default_account_id:
        from app.models import Account
        account = db.query(Account).filter(
            Account.id == request.default_account_id
        ).first()
        if not account:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid account_id",
            )

    result = execute_import(
        db,
        request.file_id,
        household.id,
        current_user.id,
        request.column_mapping,
        request.default_account_id,
        request.default_payer_member_id,
        request.skip_duplicates,
    )

    return result
