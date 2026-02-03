from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    auth_router,
    household_router,
    entries_router,
    summary_router,
    settlement_router,
)

app = FastAPI(
    title="OurLedger API",
    description="공동 가계부 애플리케이션 API",
    version="1.0.0",
)

# CORS 설정
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://frontend:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth_router)
app.include_router(household_router)
app.include_router(entries_router)
app.include_router(summary_router)
app.include_router(settlement_router)


@app.get("/")
def root():
    return {"message": "OurLedger API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
