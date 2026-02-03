from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import extract, func

from app.models import Entry, Category, HouseholdMember
from app.schemas import (
    CategorySummary,
    MemberSummary,
    MonthlySummary,
    SettlementItem,
    SettlementResponse,
)


def get_monthly_summary(db: Session, household_id: UUID, month: str) -> MonthlySummary:
    year, mon = map(int, month.split("-"))

    # Base query for the month
    base_query = db.query(Entry).filter(
        Entry.household_id == household_id,
        extract("year", Entry.date) == year,
        extract("month", Entry.date) == mon,
    )

    # Total income and expense
    totals = (
        base_query.with_entities(
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

    # By category
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

    return MonthlySummary(
        month=month,
        total_income=total_income,
        total_expense=total_expense,
        balance=total_income - total_expense,
        by_category=by_category,
        by_member=by_member,
    )


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
        )

    # Calculate how much each member paid for shared expenses
    member_paid = {}
    for member in members:
        paid = sum(e.amount for e in shared_entries if e.payer_member_id == member.id)
        member_paid[member.id] = {
            "name": member.user.name,
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
    )
