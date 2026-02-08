"""Reset database and re-seed."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models import User, Entry, HouseholdMember, Household, Account, MonthlySettlement

db = SessionLocal()
db.query(Entry).delete()
db.query(MonthlySettlement).delete()
db.query(Account).delete()
db.query(HouseholdMember).delete()
db.query(Household).delete()
db.query(User).delete()
db.commit()
db.close()
print("All data deleted")
