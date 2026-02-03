from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.schemas import SettlementResponse
from app.services.auth import get_current_user
from app.services.household import get_user_household
from app.services.summary import calculate_settlement
from app.models import User

router = APIRouter(prefix="/api/settlement", tags=["settlement"])


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
