# Jan Arogya

Hospital discount card management platform. Field partners register customers,
issue a server-generated card ID, and print a PDF card carrying a QR code.
Scanning the QR opens a public, no-login page showing card validity and the
directory of empanelled hospitals. A super admin manages partners, hospitals,
and the state → city → tahsil location master.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design rationale,
data model, and business rules this implementation preserves from the
original developer documentation.

## Stack

- **Backend**: FastAPI, SQLAlchemy 2.x, Alembic, PostgreSQL, JWT auth, ReportLab (PDF), `qrcode`, Pillow.
- **Frontend**: React 19 + TypeScript, Vite, Tailwind CSS v4, TanStack Query, Zustand, React Router.

## Prerequisites

- Python 3.12+
- Node.js 20+
- Docker (for local PostgreSQL — or point `DATABASE_URL` at any Postgres instance you already have)

## Backend setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate      # macOS/Linux

pip install -r requirements.txt
copy .env.example .env           # Windows: copy, macOS/Linux: cp
```

Edit `.env` and set real values for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
and `AADHAAR_ENCRYPTION_KEY` (a base64-encoded 32-byte key). You can generate
all three with:

```bash
python -c "import secrets, base64; print(secrets.token_hex(32)); print(secrets.token_hex(32)); print(base64.b64encode(secrets.token_bytes(32)).decode())"
```

Start Postgres (the compose file maps the container's 5432 to host port
**5433** to avoid clashing with any Postgres already installed on your
machine — adjust `DATABASE_URL` in `.env` if you change this):

```bash
docker compose up -d postgres
```

Run migrations and seed development data:

```bash
python -m alembic upgrade head
python -m scripts.seed
```

The seed script prints a demo admin and partner login:

- Admin: `9999999999` / `Admin@123`
- Partner: `9098475371` / `Partner@123`

Run the API:

```bash
uvicorn app.main:app --reload
```

The API is served at `http://localhost:8000`, versioned under `/api/v1`
(e.g. `http://localhost:8000/api/v1/auth/login`). Interactive docs at
`http://localhost:8000/docs`.

### Tests

```bash
python -m pytest
```

Tests run against an isolated in-memory SQLite database — no running
Postgres instance is required to run the suite.

## Frontend setup

```bash
cd frontend
npm install
copy .env.example .env            # Windows: copy, macOS/Linux: cp
npm run dev
```

The app is served at `http://localhost:5173`. `VITE_API_BASE_URL` in `.env`
should point at the backend's `/api/v1` prefix.

Key routes:

| Route | Description |
|---|---|
| `/login` | Partner login |
| `/admin/login` | Admin login |
| `/app` | Partner dashboard (protected) |
| `/admin` | Admin dashboard (protected) |
| `/card-status/:cardId` | Public QR scan destination (no login) |

### Build

```bash
npm run build
```

## Project layout

```
Arogya/
├── ARCHITECTURE.md
├── docker-compose.yml       # Postgres for local dev
├── backend/
│   ├── app/
│   │   ├── core/            # config, security, exceptions, logging, rate limiting, file storage
│   │   ├── db/               # SQLAlchemy base + session
│   │   ├── models/           # ORM models
│   │   ├── schemas/          # Pydantic request/response contracts
│   │   ├── repositories/     # the only layer that queries the database
│   │   ├── services/         # business rules (card ID, PDF/QR, crypto, auth)
│   │   ├── api/v1/routers/   # thin HTTP layer
│   │   └── main.py
│   ├── alembic/               # migrations
│   ├── tests/
│   ├── scripts/seed.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── app/               # router, providers, route guards
    │   ├── pages/              # one file per screen (admin/ subfolder for admin screens)
    │   ├── components/ui/      # design system primitives
    │   ├── components/layout/  # shells (partner, admin, auth)
    │   ├── api/                 # typed API client modules
    │   ├── store/                # auth + toast state (Zustand)
    │   └── hooks/
    └── package.json
```

## Security notes

- Access tokens live in memory only (never `localStorage`); refresh tokens
  are httpOnly cookies, scoped separately for partner and admin sessions.
- Aadhaar numbers are AES-256-GCM encrypted at rest; only the last 4 digits
  are ever stored in plaintext or returned by the API.
- Every customer query is partner-scoped at the repository layer — there is
  no method that returns customer data without a `partner_id` filter (see
  `tests/test_card_logic.py` for a guardrail test enforcing this).
- Login and the public card-status endpoint are rate-limited.
