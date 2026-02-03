from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas import HouseholdCreate, HouseholdJoin, HouseholdResponse, MemberResponse
from app.services.auth import get_current_user
from app.services.household import (
    get_user_household,
    get_household_by_invite_code,
    create_household,
    join_household,
    get_household_members,
    get_member_by_user_and_household,
)
from app.models import User

router = APIRouter(prefix="/api/household", tags=["household"])


@router.get("", response_model=HouseholdResponse | None)
def get_my_household(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    household = get_user_household(db, current_user.id)
    return household


@router.post("", response_model=HouseholdResponse)
def create_new_household(
    household_data: HouseholdCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = get_user_household(db, current_user.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already belong to a household",
        )

    household = create_household(db, household_data, current_user.id)
    return household


@router.post("/join", response_model=HouseholdResponse)
def join_existing_household(
    join_data: HouseholdJoin,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = get_user_household(db, current_user.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already belong to a household",
        )

    household = get_household_by_invite_code(db, join_data.invite_code)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invite code",
        )

    join_household(db, household.id, current_user.id)
    return household


@router.get("/members", response_model=list[MemberResponse])
def get_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    members = get_household_members(db, household.id)
    return [
        MemberResponse(
            id=m.id,
            user_id=m.user_id,
            user_name=m.user.name,
            user_email=m.user.email,
            role=m.role,
            joined_at=m.joined_at,
        )
        for m in members
    ]
