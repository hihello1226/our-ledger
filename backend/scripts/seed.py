"""
Seed script for development/testing.
Run with: python -m scripts.seed
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, timedelta
import random

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models import User, Household, HouseholdMember, Category, Entry


def seed():
    db = SessionLocal()

    try:
        # Check if data already exists
        if db.query(User).first():
            print("Database already has data. Skipping seed.")
            return

        # Create users
        user1 = User(
            email="user1@example.com",
            hashed_password=get_password_hash("password123"),
            name="홍길동",
        )
        user2 = User(
            email="user2@example.com",
            hashed_password=get_password_hash("password123"),
            name="김철수",
        )
        db.add_all([user1, user2])
        db.flush()
        print(f"Created users: {user1.email}, {user2.email}")

        # Create household
        household = Household(name="우리집")
        db.add(household)
        db.flush()
        print(f"Created household: {household.name} (invite code: {household.invite_code})")

        # Add members
        member1 = HouseholdMember(
            household_id=household.id,
            user_id=user1.id,
            role="owner",
        )
        member2 = HouseholdMember(
            household_id=household.id,
            user_id=user2.id,
            role="member",
        )
        db.add_all([member1, member2])
        db.flush()
        print("Added household members")

        # Get categories
        expense_categories = (
            db.query(Category)
            .filter(Category.household_id == None, Category.type == "expense")
            .all()
        )
        income_categories = (
            db.query(Category)
            .filter(Category.household_id == None, Category.type == "income")
            .all()
        )

        # Create sample entries for the last 3 months
        today = date.today()
        members = [member1, member2]

        for month_offset in range(3):
            # Calculate year and month properly
            year = today.year
            month = today.month - month_offset
            while month < 1:
                month += 12
                year -= 1
            month_start = date(year, month, 1)

            # Income entries
            for member in members:
                salary = Entry(
                    household_id=household.id,
                    created_by_user_id=member.user_id,
                    type="income",
                    amount=random.randint(250, 400) * 10000,
                    date=month_start.replace(day=25),
                    category_id=income_categories[0].id if income_categories else None,
                    memo="급여",
                    payer_member_id=member.id,
                    shared=False,
                )
                db.add(salary)

            # Expense entries
            for day in range(1, 28):
                if random.random() < 0.4:  # 40% chance of expense each day
                    payer = random.choice(members)
                    category = random.choice(expense_categories) if expense_categories else None
                    shared = random.random() < 0.6  # 60% chance of shared expense

                    entry = Entry(
                        household_id=household.id,
                        created_by_user_id=payer.user_id,
                        type="expense",
                        amount=random.randint(5, 150) * 1000,
                        date=month_start.replace(day=day),
                        category_id=category.id if category else None,
                        memo=None,
                        payer_member_id=payer.id,
                        shared=shared,
                    )
                    db.add(entry)

        db.commit()
        print("Created sample entries")
        print("\n=== Seed completed ===")
        print(f"Login credentials:")
        print(f"  Email: user1@example.com / Password: password123")
        print(f"  Email: user2@example.com / Password: password123")
        print(f"Household invite code: {household.invite_code}")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
