from app.api.auth import router as auth_router
from app.api.household import router as household_router
from app.api.entries import router as entries_router
from app.api.summary import router as summary_router
from app.api.settlement import router as settlement_router

__all__ = [
    "auth_router",
    "household_router",
    "entries_router",
    "summary_router",
    "settlement_router",
]
