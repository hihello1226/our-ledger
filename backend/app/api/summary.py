from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.schemas.summary import MonthlySummary
from app.services.auth import get_current_user
from app.services.household import get_user_household
from app.services.summary import get_monthly_summary
from app.models import User

router = APIRouter(prefix="/api/summary", tags=["summary"])


@router.get("", response_model=MonthlySummary)
def get_summary(
    month: str = Query(
        default=None,
        description="YYYY-MM format. Defaults to current month",
    ),
    account_ids: str | None = Query(
        default=None,
        description="Comma-separated UUIDs for filtering by accounts",
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

    summary = get_monthly_summary(db, household.id, month, parsed_account_ids)
    return summary
