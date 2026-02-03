from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.schemas.summary import SettlementResponse, MonthlySettlementRecord
from app.services.auth import get_current_user
from app.services.household import get_user_household
from app.services.summary import (
    calculate_settlement,
    save_monthly_settlement,
    finalize_monthly_settlement,
)
from app.models import User

router = APIRouter(prefix="/api/settlement", tags=["settlement"])


class SaveSettlementRequest(BaseModel):
    user_id: UUID
    settlement_amount: int


class FinalizeSettlementRequest(BaseModel):
    month: str


@router.get("", response_model=SettlementResponse)
def get_settlement(
    month: str = Query(
        default=None,
        description="YYYY-MM format. Defaults to current month",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    if not month:
        month = datetime.now().strftime("%Y-%m")

    settlement = calculate_settlement(db, household.id, month)
    return settlement


@router.post("/save", response_model=MonthlySettlementRecord)
def save_settlement(
    month: str = Query(..., description="YYYY-MM format"),
    request: SaveSettlementRequest = ...,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a monthly settlement record for a user"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    record = save_monthly_settlement(
        db,
        household.id,
        request.user_id,
        month,
        request.settlement_amount,
    )

    user = db.query(User).filter(User.id == record.user_id).first()

    return MonthlySettlementRecord(
        id=record.id,
        user_id=record.user_id,
        user_name=user.name if user else "Unknown",
        month=record.month,
        settlement_amount=record.settlement_amount,
        is_finalized=record.is_finalized,
    )


@router.post("/finalize")
def finalize_settlement(
    request: FinalizeSettlementRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Finalize all settlement records for a month"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    records = finalize_monthly_settlement(db, household.id, request.month)
    return {"message": f"Finalized {len(records)} settlement records for {request.month}"}
