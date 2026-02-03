from uuid import UUID
from sqlalchemy.orm import Session

from app.models import Household, HouseholdMember, User
from app.schemas import HouseholdCreate


def get_user_household(db: Session, user_id: UUID) -> Household | None:
    member = (
        db.query(HouseholdMember)
        .filter(HouseholdMember.user_id == user_id)
        .first()
    )
    if member:
        return member.household
    return None


def get_household_by_invite_code(db: Session, invite_code: str) -> Household | None:
    return db.query(Household).filter(Household.invite_code == invite_code).first()


def create_household(
    db: Session, household_data: HouseholdCreate, owner_id: UUID
) -> Household:
    household = Household(name=household_data.name)
    db.add(household)
    db.flush()

    member = HouseholdMember(
        household_id=household.id,
        user_id=owner_id,
        role="owner",
    )
    db.add(member)
    db.commit()
    db.refresh(household)
    return household


def join_household(db: Session, household_id: UUID, user_id: UUID) -> HouseholdMember:
    member = HouseholdMember(
        household_id=household_id,
        user_id=user_id,
        role="member",
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def get_household_members(db: Session, household_id: UUID) -> list[HouseholdMember]:
    return (
        db.query(HouseholdMember)
        .filter(HouseholdMember.household_id == household_id)
        .all()
    )


def get_member_by_user_and_household(
    db: Session, user_id: UUID, household_id: UUID
) -> HouseholdMember | None:
    return (
        db.query(HouseholdMember)
        .filter(
            HouseholdMember.user_id == user_id,
            HouseholdMember.household_id == household_id,
        )
        .first()
    )
