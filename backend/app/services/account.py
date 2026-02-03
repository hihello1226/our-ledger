from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models import Account, User, Household, HouseholdMember
from app.schemas.account import AccountCreate, AccountUpdate


def get_accessible_accounts(
    db: Session,
    user_id: UUID,
    household_id: UUID | None = None,
) -> list[Account]:
    """
    Get accounts accessible to the user:
    - User's own accounts
    - Shared accounts in the same household with is_shared_visible=True
    """
    query = db.query(Account)

    if household_id:
        # Own accounts + shared visible accounts in household
        query = query.filter(
            or_(
                Account.owner_user_id == user_id,
                (Account.household_id == household_id) & (Account.is_shared_visible == True),
            )
        )
    else:
        # Only own accounts
        query = query.filter(Account.owner_user_id == user_id)

    return query.order_by(Account.created_at.desc()).all()


def get_account_by_id(db: Session, account_id: UUID) -> Account | None:
    return db.query(Account).filter(Account.id == account_id).first()


def validate_account_access(
    db: Session,
    account: Account,
    user_id: UUID,
    household_id: UUID | None = None,
    require_ownership: bool = False,
) -> bool:
    """
    Validate if user can access the account.
    - require_ownership=True: only owner can access (for update/delete)
    - require_ownership=False: owner OR (same household + is_shared_visible) can view
    """
    if account.owner_user_id == user_id:
        return True

    if require_ownership:
        return False

    # Check shared visibility
    if household_id and account.household_id == household_id and account.is_shared_visible:
        return True

    return False


def create_account(
    db: Session,
    account_data: AccountCreate,
    user_id: UUID,
) -> Account:
    # Set is_shared_visible default based on type
    is_shared_visible = account_data.is_shared_visible
    if account_data.type == "shared" and not account_data.is_shared_visible:
        is_shared_visible = True

    account = Account(
        owner_user_id=user_id,
        household_id=account_data.household_id,
        name=account_data.name,
        bank_name=account_data.bank_name,
        type=account_data.type,
        balance=account_data.balance,
        is_shared_visible=is_shared_visible,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def update_account(db: Session, account: Account, account_data: AccountUpdate) -> Account:
    update_data = account_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return account


def delete_account(db: Session, account: Account) -> None:
    db.delete(account)
    db.commit()
