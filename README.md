# OurLedger - 공동 가계부

가족/룸메이트와 함께 사용하는 공동 가계부 애플리케이션입니다.

## 버전

- **v1.1.0** (2024-02) - 계좌 관리 및 데이터 연동
  - 계좌 관리 (개인/공동 계좌)
  - 이체 거래 지원
  - 누적 정산 잔액 표시
  - CSV 파일 Import
  - Google Sheets 연동 (Import/Export)
  - 계좌별 필터링
  - 현재 자산(Net Balance) 표시

- **v0.1.0** (2024-02) - 초기 프로토타입
  - 사용자 인증 (회원가입/로그인)
  - 가구 생성 및 초대 코드 참여
  - 거래 CRUD (수입/지출)
  - 공동 지출 표시 및 정산 계산
  - 월별 대시보드

---

## 기술 스택

### Backend
| 기술 | 버전 | 용도 |
|------|------|------|
| Python | 3.11 | 런타임 |
| FastAPI | 0.109.0 | 웹 프레임워크 |
| SQLAlchemy | 2.0.25 | ORM |
| Alembic | 1.13.1 | DB 마이그레이션 |
| PostgreSQL | 15 | 데이터베이스 |
| Pydantic | 2.5.3 | 데이터 검증 |
| python-jose | 3.3.0 | JWT 토큰 |
| passlib + bcrypt | 1.7.4 / 4.0.1 | 비밀번호 해싱 |
| google-api-python-client | 2.111.0 | Google Sheets API |

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 14.2.28 | React 프레임워크 |
| React | 18.3.1 | UI 라이브러리 |
| TypeScript | 5.3.3 | 타입 안정성 |
| TailwindCSS | 3.4.1 | 스타일링 |

### Infrastructure
| 기술 | 용도 |
|------|------|
| Docker Compose | 컨테이너 오케스트레이션 |
| PostgreSQL 15 | 데이터 저장소 |

---

## 구현 기능

### 1. 인증 시스템
- **회원가입**: 이메일, 비밀번호, 이름으로 계정 생성
- **로그인**: JWT 토큰 기반 인증
- **세션 유지**: LocalStorage에 토큰 저장

### 2. 가구(Household) 관리
- **가구 생성**: 새 가구 생성 시 자동으로 초대 코드 발급
- **가구 참여**: 12자리 초대 코드로 기존 가구에 참여
- **멤버 관리**: owner/member 역할 구분

### 3. 계좌(Account) 관리 (v1.1)
- **계좌 유형**: 개인 계좌 / 공동 계좌
- **잔액 관리**: 수동 잔액 업데이트
- **공개 설정**: 가구 구성원에게 공개 여부 선택
- **권한 관리**: 본인 계좌만 수정/삭제 가능

### 4. 거래(Entry) 관리
- **거래 유형**: 수입/지출/이체(v1.1)
- **계좌 연결**: 거래에 계좌 지정 가능 (v1.1)
- **이체 거래**: 출금 계좌 → 입금 계좌 이체 (v1.1)
- **공동 지출**: 정산 대상 여부 표시
- **결제자 지정**: 실제 결제한 멤버 선택
- **시간 기록**: 날짜 + 시간 입력 (v1.1)
- **월별/계좌별 필터링**: 다양한 조건으로 조회

### 5. 카테고리
- **기본 카테고리** (12개):
  - 지출: 식비, 교통비, 주거비, 통신비, 의료비, 문화/여가, 쇼핑, 기타
  - 수입: 급여, 부수입, 용돈, 기타수입

### 6. 대시보드
- **월별 요약**: 총 수입, 총 지출, 잔액
- **현재 자산**: 계좌 잔액 합계 (v1.1)
- **계좌 필터**: 멀티 선택으로 특정 계좌만 조회 (v1.1)
- **카테고리별 통계**: 지출 카테고리별 합계
- **멤버별 통계**: 각 멤버의 지출/공동지출 현황
- **누적 정산 현황**: 각 멤버의 누적 정산 잔액 (v1.1)

### 7. 정산 계산
- **공동 지출 합산**: 해당 월의 공동 지출 총액
- **1/N 계산**: 멤버 수로 균등 분할
- **정산 내역**: 누가 누구에게 얼마를 보내야 하는지 계산
- **누적 정산**: 월별 정산 기록 및 누적 잔액 (v1.1)
- **정산 확정**: 월별 정산 확정 기능 (v1.1)

### 8. 데이터 Import (v1.1)
- **CSV Import**: 은행 내역 CSV 파일 Import
  - 컬럼 자동 감지 및 매핑
  - 미리보기 기능
  - 중복 검사 및 건너뛰기
- **Google Sheets 연동**:
  - 서비스 계정 인증
  - Import: 시트에서 거래 내역 가져오기
  - Export: 거래 내역을 시트로 내보내기
  - 증분 동기화 (마지막 동기화 위치 기억)

---

## 데이터베이스 스키마

```
users (사용자)
├── id (UUID, PK)
├── email (unique)
├── hashed_password
├── name
└── created_at

households (가구)
├── id (UUID, PK)
├── name
├── invite_code (unique, 12자리)
└── created_at

household_members (가구 멤버)
├── id (UUID, PK)
├── household_id (FK → households)
├── user_id (FK → users)
├── role (owner/member)
└── joined_at

accounts (계좌) [v1.1]
├── id (UUID, PK)
├── owner_user_id (FK → users)
├── household_id (FK → households, nullable)
├── name
├── bank_name
├── type (personal/shared)
├── balance
├── is_shared_visible
├── created_at
└── updated_at

categories (카테고리)
├── id (UUID, PK)
├── household_id (FK, nullable - NULL이면 기본 카테고리)
├── name
├── type (expense/income)
└── sort_order

entries (거래)
├── id (UUID, PK)
├── household_id (FK → households)
├── created_by_user_id (FK → users)
├── type (expense/income/transfer) [v1.1: transfer 추가]
├── amount (정수, 원화)
├── date
├── occurred_at [v1.1]
├── category_id (FK → categories)
├── memo
├── payer_member_id (FK → household_members)
├── shared (boolean, 공동 지출 여부)
├── account_id (FK → accounts) [v1.1]
├── transfer_from_account_id (FK → accounts) [v1.1]
├── transfer_to_account_id (FK → accounts) [v1.1]
├── created_at
└── updated_at

external_data_sources (외부 데이터 소스) [v1.1]
├── id (UUID, PK)
├── household_id (FK → households)
├── created_by_user_id (FK → users)
├── type (google_sheet)
├── sheet_id
├── sheet_name
├── account_id (FK → accounts)
├── column_mapping (JSON)
├── sync_direction (import/export/both)
├── last_synced_at
├── last_synced_row
├── created_at
└── updated_at

entry_external_refs (외부 참조) [v1.1]
├── id (UUID, PK)
├── entry_id (FK → entries)
├── source_id (FK → external_data_sources)
├── external_row_id
├── external_hash
├── created_at
└── updated_at

monthly_settlements (월별 정산) [v1.1]
├── id (UUID, PK)
├── household_id (FK → households)
├── user_id (FK → users)
├── month (YYYY-MM)
├── settlement_amount
├── is_finalized
├── created_at
└── updated_at
```

---

## 빠른 시작

### 1. 저장소 클론
```bash
git clone <repository-url>
cd our-ledger
```

### 2. Docker Compose로 실행
```bash
docker-compose up --build
```

### 3. 데이터베이스 마이그레이션
```bash
docker-compose exec backend alembic upgrade head
```

### 4. (선택) 샘플 데이터 생성
```bash
docker-compose exec backend python -m scripts.seed
```

### 5. 접속
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API 문서 (Swagger)**: http://localhost:8000/docs

---

## API 엔드포인트

### Auth
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| GET | `/api/auth/me` | 현재 사용자 정보 |

### Household
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/household` | 내 가구 조회 |
| POST | `/api/household` | 가구 생성 |
| POST | `/api/household/join` | 초대 코드로 참여 |
| GET | `/api/household/members` | 멤버 목록 |

### Accounts (v1.1)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/accounts` | 계좌 목록 |
| POST | `/api/accounts` | 계좌 생성 |
| GET | `/api/accounts/{id}` | 계좌 상세 |
| PATCH | `/api/accounts/{id}` | 계좌 수정 |
| DELETE | `/api/accounts/{id}` | 계좌 삭제 |

### Entries
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/entries` | 거래 목록 (필터: month, type, account_ids) |
| POST | `/api/entries` | 거래 생성 |
| GET | `/api/entries/{id}` | 거래 상세 |
| PUT | `/api/entries/{id}` | 거래 수정 |
| DELETE | `/api/entries/{id}` | 거래 삭제 |
| GET | `/api/entries/categories` | 카테고리 목록 |

### Summary & Settlement
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/summary?month=YYYY-MM&account_ids=...` | 월별 요약 |
| GET | `/api/settlement?month=YYYY-MM` | 정산 계산 |
| POST | `/api/settlement/save` | 정산 기록 저장 (v1.1) |
| POST | `/api/settlement/finalize` | 정산 확정 (v1.1) |

### Import (v1.1)
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/import/csv/upload` | CSV 업로드 + 미리보기 |
| POST | `/api/import/csv/confirm` | Import 확정 |

### External Sources (v1.1)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/external-sources` | 외부 소스 목록 |
| POST | `/api/external-sources/google-sheet` | Google Sheet 등록 |
| GET | `/api/external-sources/{id}` | 외부 소스 상세 |
| PATCH | `/api/external-sources/{id}` | 외부 소스 수정 |
| DELETE | `/api/external-sources/{id}` | 외부 소스 삭제 |
| POST | `/api/external-sources/{id}/sync-import` | Import 동기화 |
| POST | `/api/external-sources/{id}/sync-export` | Export 동기화 |

---

## 프로젝트 구조

```
our-ledger/
├── backend/
│   ├── app/
│   │   ├── api/          # API 라우터
│   │   │   ├── auth.py
│   │   │   ├── household.py
│   │   │   ├── entries.py
│   │   │   ├── accounts.py       [v1.1]
│   │   │   ├── summary.py
│   │   │   ├── settlement.py
│   │   │   ├── import_csv.py     [v1.1]
│   │   │   └── external_sources.py [v1.1]
│   │   ├── models/       # SQLAlchemy 모델
│   │   │   ├── user.py
│   │   │   ├── household.py
│   │   │   ├── category.py
│   │   │   ├── entry.py
│   │   │   ├── account.py        [v1.1]
│   │   │   ├── external_source.py [v1.1]
│   │   │   └── settlement.py     [v1.1]
│   │   ├── schemas/      # Pydantic 스키마
│   │   ├── services/     # 비즈니스 로직
│   │   │   ├── auth.py
│   │   │   ├── household.py
│   │   │   ├── entry.py
│   │   │   ├── account.py        [v1.1]
│   │   │   ├── summary.py
│   │   │   ├── csv_import.py     [v1.1]
│   │   │   └── google_sheets.py  [v1.1]
│   │   ├── core/         # 설정, DB 연결, 보안 유틸
│   │   └── main.py       # FastAPI 앱 진입점
│   ├── alembic/          # DB 마이그레이션
│   │   └── versions/
│   │       ├── 001_initial.py
│   │       └── 002_v1_1_accounts_and_extensions.py [v1.1]
│   ├── scripts/          # seed.py 등 유틸리티
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── app/          # Next.js App Router 페이지
│       │   ├── login/
│       │   ├── register/
│       │   ├── onboarding/
│       │   ├── dashboard/
│       │   ├── entries/
│       │   ├── settlement/
│       │   ├── accounts/         [v1.1]
│       │   ├── import/csv/       [v1.1]
│       │   └── settings/integrations/google-sheets/ [v1.1]
│       └── lib/          # API 클라이언트, Auth Context
├── docker-compose.yml
└── README.md
```

---

## Google Sheets 연동 설정 (v1.1)

### 1. Google Cloud Console에서 서비스 계정 생성
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 생성 또는 선택
3. APIs & Services > Enable APIs > Google Sheets API 활성화
4. APIs & Services > Credentials > Create Credentials > Service Account
5. 서비스 계정 키(JSON) 다운로드

### 2. 환경 변수 설정
```bash
# backend/.env
GOOGLE_SERVICE_ACCOUNT_FILE=/path/to/service-account.json
```

### 3. Google Sheet 공유
- 동기화할 Google Sheet를 서비스 계정 이메일과 공유 (편집자 권한)

---

## 테스트 계정 (seed 데이터 사용 시)

| 이메일 | 비밀번호 | 이름 |
|--------|----------|------|
| user1@example.com | password123 | 홍길동 |
| user2@example.com | password123 | 김철수 |

---

## 환경 변수

### Backend (.env)
```
DATABASE_URL=postgresql://ourledger:ourledger123@localhost:5432/ourledger
SECRET_KEY=your-secret-key-change-in-production
GOOGLE_SERVICE_ACCOUNT_FILE=/path/to/service-account.json  # v1.1 (선택)
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 라이선스

MIT
