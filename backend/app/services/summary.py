from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import extract, func, or_

from app.models import Entry, Category, HouseholdMember, Account, MonthlySettlement, User
from app.schemas.summary import (
    CategorySummary,
    MemberSummary,
    MonthlySummary,
    SettlementItem,
    SettlementResponse,
    CumulativeSettlement,
    MonthlySettlementRecord,
)


def get_monthly_summary(
    db: Session,
    household_id: UUID,
    month: str,
    current_user_id: UUID,
    account_ids: list[UUID] | None = None,
) -> MonthlySummary:
    year, mon = map(int, month.split("-"))

    # Get list of hidden account IDs (accounts not visible to this user)
    hidden_accounts = db.query(Account.id).filter(
        Account.is_shared_visible == False,
        Account.owner_user_id != current_user_id,
    ).all()
    hidden_account_id_list = [a.id for a in hidden_accounts]

    # Base query for the month with visibility filter
    base_query = db.query(Entry).filter(
        Entry.household_id == household_id,
        extract("year", Entry.date) == year,
        extract("month", Entry.date) == mon,
    )

    # Exclude entries linked to hidden accounts
    if hidden_account_id_list:
        base_query = base_query.filter(
            or_(
                Entry.account_id == None,
                ~Entry.account_id.in_(hidden_account_id_list),
            )
        )

    # Apply account filter if provided
    if account_ids:
        base_query = base_query.filter(
            or_(
                Entry.account_id.in_(account_ids),
                Entry.transfer_from_account_id.in_(account_ids),
                Entry.transfer_to_account_id.in_(account_ids),
            )
        )

    # Total income and expense (exclude transfers)
    totals = (
        base_query.filter(Entry.type.in_(["income", "expense"]))
        .with_entities(
            Entry.type,
            func.sum(Entry.amount).label("total"),
        )
        .group_by(Entry.type)
        .all()
    )

    total_income = 0
    total_expense = 0
    for t in totals:
        if t.type == "income":
            total_income = t.total or 0
        elif t.type == "expense":
            total_expense = t.total or 0

    # By category (expenses only, exclude transfers)
    by_category_data = (
        base_query.with_entities(
            Entry.category_id,
            Category.name,
            func.sum(Entry.amount).label("total"),
        )
        .outerjoin(Category, Entry.category_id == Category.id)
        .filter(Entry.type == "expense")
        .group_by(Entry.category_id, Category.name)
        .all()
    )

    by_category = [
        CategorySummary(
            category_id=c.category_id,
            category_name=c.name or "미분류",
            total=c.total or 0,
        )
        for c in by_category_data
    ]

    # By member
    members = db.query(HouseholdMember).filter(
        HouseholdMember.household_id == household_id
    ).all()

    by_member = []
    for member in members:
        member_expenses = (
            base_query.filter(
                Entry.payer_member_id == member.id,
                Entry.type == "expense",
            )
            .with_entities(func.sum(Entry.amount))
            .scalar()
            or 0
        )

        member_income = (
            base_query.filter(
                Entry.payer_member_id == member.id,
                Entry.type == "income",
            )
            .with_entities(func.sum(Entry.amount))
            .scalar()
            or 0
        )

        member_shared = (
            base_query.filter(
                Entry.payer_member_id == member.id,
                Entry.type == "expense",
                Entry.shared == True,
            )
            .with_entities(func.sum(Entry.amount))
            .scalar()
            or 0
        )

        by_member.append(
            MemberSummary(
                member_id=member.id,
                member_name=member.user.name,
                total_expense=member_expenses,
                total_income=member_income,
                shared_expense=member_shared,
            )
        )

    # Calculate cumulative settlement
    cumulative_settlement = calculate_cumulative_settlement(db, household_id, month)

    # Calculate net balance (sum of all accessible account balances)
    net_balance = calculate_net_balance(db, household_id, current_user_id, account_ids)

    return MonthlySummary(
        month=month,
        total_income=total_income,
        total_expense=total_expense,
        balance=total_income - total_expense,
        by_category=by_category,
        by_member=by_member,
        cumulative_settlement=cumulative_settlement,
        net_balance=net_balance,
        filtered_account_ids=account_ids or [],
    )


def calculate_cumulative_settlement(
    db: Session,
    household_id: UUID,
    up_to_month: str,
) -> list[CumulativeSettlement]:
    """
    Calculate cumulative settlement balance for each user up to a given month.
    Positive balance = user should receive money
    Negative balance = user should pay money
    """
    # Get all settlement records up to and including the month
    records = (
        db.query(MonthlySettlement)
        .filter(
            MonthlySettlement.household_id == household_id,
            MonthlySettlement.month <= up_to_month,
        )
        .all()
    )

    # Aggregate by user
    user_balances = {}
    for record in records:
        if record.user_id not in user_balances:
            user_balances[record.user_id] = 0
        user_balances[record.user_id] += record.settlement_amount

    # Get user names
    result = []
    for user_id, balance in user_balances.items():
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            result.append(
                CumulativeSettlement(
                    user_id=user_id,
                    user_name=user.name,
                    cumulative_balance=balance,
                )
            )

    return result


def calculate_net_balance(
    db: Session,
    household_id: UUID,
    current_user_id: UUID,
    account_ids: list[UUID] | None = None,
) -> int:
    """
    Calculate total net balance from account balances.
    Only includes:
    - Accounts owned by the current user
    - Accounts from other users with is_shared_visible = True
    If account_ids is provided, only sum those accounts (still respecting visibility).
    """
    query = db.query(func.sum(Account.balance)).filter(
        Account.household_id == household_id,
        Account.balance.isnot(None),
        or_(
            Account.owner_user_id == current_user_id,
            Account.is_shared_visible == True,
        ),
    )

    if account_ids:
        query = query.filter(Account.id.in_(account_ids))

    total = query.scalar()
    return total or 0


def calculate_settlement(
    db: Session, household_id: UUID, month: str
) -> SettlementResponse:
    year, mon = map(int, month.split("-"))

    # Get all shared expenses for the month
    shared_entries = (
        db.query(Entry)
        .filter(
            Entry.household_id == household_id,
            Entry.type == "expense",
            Entry.shared == True,
            extract("year", Entry.date) == year,
            extract("month", Entry.date) == mon,
        )
        .all()
    )

    total_shared = sum(e.amount for e in shared_entries)

    # Get members
    members = (
        db.query(HouseholdMember)
        .filter(HouseholdMember.household_id == household_id)
        .all()
    )

    if len(members) < 2:
        return SettlementResponse(
            month=month,
            total_shared_expense=total_shared,
            settlements=[],
            cumulative_settlements=calculate_cumulative_settlement(db, household_id, month),
            monthly_records=get_monthly_settlement_records(db, household_id, month),
        )

    # Calculate how much each member paid for shared expenses
    member_paid = {}
    for member in members:
        paid = sum(e.amount for e in shared_entries if e.payer_member_id == member.id)
        member_paid[member.id] = {
            "name": member.user.name,
            "user_id": member.user_id,
            "paid": paid,
        }

    # Equal split per person
    per_person = total_shared // len(members)

    # Calculate balance (positive = overpaid, negative = underpaid)
    balances = []
    for member_id, data in member_paid.items():
        balance = data["paid"] - per_person
        balances.append({
            "member_id": member_id,
            "user_id": data["user_id"],
            "name": data["name"],
            "balance": balance,
        })

    # Sort by balance (negative first - they need to pay)
    balances.sort(key=lambda x: x["balance"])

    # Calculate settlements (who pays whom)
    settlements = []
    i, j = 0, len(balances) - 1

    while i < j:
        debtor = balances[i]
        creditor = balances[j]

        if debtor["balance"] >= 0:
            break

        amount = min(-debtor["balance"], creditor["balance"])
        if amount > 0:
            settlements.append(
                SettlementItem(
                    from_member_id=debtor["member_id"],
                    from_member_name=debtor["name"],
                    to_member_id=creditor["member_id"],
                    to_member_name=creditor["name"],
                    amount=amount,
                )
            )

        debtor["balance"] += amount
        creditor["balance"] -= amount

        if debtor["balance"] == 0:
            i += 1
        if creditor["balance"] == 0:
            j -= 1

    return SettlementResponse(
        month=month,
        total_shared_expense=total_shared,
        settlements=settlements,
        cumulative_settlements=calculate_cumulative_settlement(db, household_id, month),
        monthly_records=get_monthly_settlement_records(db, household_id, month),
    )


def get_monthly_settlement_records(
    db: Session,
    household_id: UUID,
    month: str,
) -> list[MonthlySettlementRecord]:
    """Get monthly settlement records for a specific month"""
    records = (
        db.query(MonthlySettlement)
        .filter(
            MonthlySettlement.household_id == household_id,
            MonthlySettlement.month == month,
        )
        .all()
    )

    result = []
    for record in records:
        user = db.query(User).filter(User.id == record.user_id).first()
        if user:
            result.append(
                MonthlySettlementRecord(
                    id=record.id,
                    user_id=record.user_id,
                    user_name=user.name,
                    month=record.month,
                    settlement_amount=record.settlement_amount,
                    is_finalized=record.is_finalized,
                )
            )

    return result


def save_monthly_settlement(
    db: Session,
    household_id: UUID,
    user_id: UUID,
    month: str,
    settlement_amount: int,
) -> MonthlySettlement:
    """Save or update a monthly settlement record"""
    existing = (
        db.query(MonthlySettlement)
        .filter(
            MonthlySettlement.household_id == household_id,
            MonthlySettlement.user_id == user_id,
            MonthlySettlement.month == month,
        )
        .first()
    )

    if existing:
        existing.settlement_amount = settlement_amount
        db.commit()
        db.refresh(existing)
        return existing

    settlement = MonthlySettlement(
        household_id=household_id,
        user_id=user_id,
        month=month,
        settlement_amount=settlement_amount,
    )
    db.add(settlement)
    db.commit()
    db.refresh(settlement)
    return settlement


def finalize_monthly_settlement(
    db: Session,
    household_id: UUID,
    month: str,
) -> list[MonthlySettlement]:
    """Finalize all settlement records for a month"""
    records = (
        db.query(MonthlySettlement)
        .filter(
            MonthlySettlement.household_id == household_id,
            MonthlySettlement.month == month,
        )
        .all()
    )

    for record in records:
        record.is_finalized = True

    db.commit()
    return records
