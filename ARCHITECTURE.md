# Jan Arogya — Architecture Note

This document is the source of truth for how the Jan Arogya hospital discount card
platform is built. It translates the original developer documentation and product
screenshots into a concrete FastAPI + React implementation. Where this document
deviates from the original doc's suggested stack (Electron/Node/MySQL/Prisma), the
business rules, field names, and workflows are preserved exactly — only the
implementation technology changes, per explicit product direction.

## 1. Product Summary

Jan Arogya issues hospital discount cards to beneficiaries ("customers") registered
by field **partners** (agents). Each customer gets a unique, server-generated
**card ID** and a printable PDF card carrying a QR code. Scanning the QR opens a
public page (no login) showing the card's validity and the directory of empanelled
hospitals. A **super admin** manages partners, hospitals, and the location master
(State → City → Tahsil) from the same web app, under a separate role scope.

Data isolation is a hard requirement: a partner only ever sees their own customers.
Hospitals and locations are global, read-only lookups for partners.

## 2. Roles

| Role | Login | Scope |
|---|---|---|
| Partner | mobile + password | Own customers only; global hospitals/locations read-only |
| Super Admin | mobile/email + password | Partners, hospitals, locations, cross-partner reports |
| Public (unauthenticated) | none | Card validity + hospital directory via QR link only |

Partner and admin JWTs carry a `scope` claim (`partner` / `admin`) and are validated
by distinct FastAPI dependencies. Refresh tokens are stored in separate, path-scoped,
httpOnly cookies (`partner_refresh_token`, `admin_refresh_token`) so the two scopes
can never be confused or hijack each other in the same browser session.

## 3. Data Model

```
states(id, name)
cities(id, name, state_id FK)
tahsils(id, name, city_id FK, state_id FK)

partners(
  id, name, mobile UNIQUE, password_hash,
  state_id FK, city_id FK, tahsil_id FK,
  is_active, created_at, updated_at
)

admins(
  id, name, mobile UNIQUE, password_hash, created_at
)

customers(
  id, card_id UNIQUE, partner_id FK,
  name, father_husband, mobile,
  aadhaar_encrypted, aadhaar_last4,          -- never store/return plaintext Aadhaar
  dob, gender, address, city_id FK, photo_path,
  entry_date, validity_date,                  -- validity = entry_date + 3 years
  is_deleted, deleted_at, created_at, updated_at
)

hospitals(
  id, name, address, city_id FK, state_id FK,
  phone, discount_details, is_active, created_at, updated_at
)

card_print_logs(
  id, customer_id FK, partner_id FK, printed_at
)
```

Key rules:
- **Card ID** = `YYYYMMDD` + 6 random digits, generated server-side at customer
  creation, uniqueness enforced with a retry loop against the DB constraint.
- **Validity date** is *derived*, never entered manually: `entry_date + 3 years`.
- **Aadhaar** is AES-256-GCM encrypted at rest (`ENCRYPTION_KEY` env, 32 bytes).
  Only the last 4 digits are stored in plaintext (`aadhaar_last4`) for masked
  display. No API route ever returns the decrypted value — there is no product
  requirement to show full Aadhaar anywhere, so the decrypt path is intentionally
  unused by any router, minimizing exposure surface.
- **Soft delete** for customers (`is_deleted`, `deleted_at`); rows are never
  physically removed.
- **Partner deactivation** (`is_active = 0`) blocks login only; customer and
  printing data is preserved untouched.
- **Printing history** is an explicit log (`card_print_logs`), not inferred from
  `entry_date`, since a customer can be reprinted many times.

## 4. Backend Architecture (FastAPI)

Layered, one-directional dependency flow:

```
routers  →  services  →  repositories  →  models
   ↓            ↓
schemas    (business rules, partner scoping, card/PDF/crypto logic)
```

- **routers/** — thin HTTP layer only: parse request, call service, map response.
  No business logic, no direct DB queries.
- **services/** — all business rules: card ID generation, validity calculation,
  partner-scoping enforcement, Aadhaar encryption, PDF/QR generation, password
  hashing/verification, rate-limit-aware auth flows.
- **repositories/** — the only layer that touches SQLAlchemy sessions/queries.
  Every customer-scoped repository method requires a `partner_id` argument —
  there is no "get all customers" method without it, which makes cross-partner
  leaks structurally hard to introduce by accident.
- **schemas/** — Pydantic request/response contracts, separate from ORM models,
  so internal columns (e.g. `aadhaar_encrypted`) can never leak by default.
- **core/** — config (`pydantic-settings`), security (JWT, password hashing),
  structured exceptions → HTTP mapping, logging, rate limiting.

API is versioned under `/api/v1`. Standard response envelope and error codes
follow the doc's §9 spec (`success/data/message/meta` and
`success/error/message/fields`).

### PDF & QR generation

- QR encodes `{PUBLIC_BASE_URL}/card-status/{card_id}` — a frontend public route.
- PDF built with `reportlab` (canvas-drawn, teal border, photo, red card-ID/validity
  text, footer with partner name/ID/helpline) — chosen over Puppeteer/WeasyPrint to
  avoid native browser/Pango dependencies while keeping full layout control.
- Every successful print call inserts a `card_print_logs` row; PDFs are generated
  on-demand and streamed, not persisted to disk, to avoid unbounded storage growth.

### File storage

`FileStorage` interface with a `LocalFileStorage` implementation (`storage/photos/`)
used for customer photos: server-side MIME/type validation via Pillow, resize to
400×400, EXIF stripped, renamed to UUID, 2 MB hard cap enforced before processing.
Swapping to S3 later means writing one new class, no service-layer changes.

## 5. Frontend Architecture (React + TypeScript)

- **Vite** build, **React Router** for routes, **TanStack Query** for all server
  state (lists, detail, mutations), **Zustand** for in-memory-only auth/UI state.
- **Auth token handling**: access token lives in memory (Zustand), never in
  `localStorage`/`sessionStorage`. Refresh token is an httpOnly cookie the browser
  sends automatically; an Axios response interceptor retries once on 401 via
  `/auth/refresh` before forcing logout.
- **Single app, role-based routing**: `/app/*` for partner screens, `/admin/*` for
  admin screens, `/card-status/:cardId` public. Route guards check the decoded
  scope claim, not just "is logged in".
- **Design system**: hand-built component primitives (Button, Input, Select,
  Textarea, Card, Table, EmptyState, Dialog, Badge, Toast, RadioGroup, PhotoUpload)
  on top of Tailwind tokens matching the doc's palette exactly (§10.1/§10.2).
  No shadcn/ui defaults — deliberately structured, teal-led, restrained.

## 6. Folder Structure

```
Arogya/
├── ARCHITECTURE.md
├── README.md
├── docker-compose.yml            # Postgres for local dev
├── backend/
│   ├── app/
│   │   ├── core/                 # config, security, exceptions, logging, rate_limit
│   │   ├── db/                   # base, session
│   │   ├── models/                # SQLAlchemy ORM
│   │   ├── schemas/               # Pydantic contracts
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── api/v1/
│   │   │   ├── deps.py
│   │   │   └── routers/
│   │   └── main.py
│   ├── alembic/
│   ├── tests/
│   ├── scripts/seed.py
│   ├── storage/                  # gitignored local file storage
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── app/                  # router, providers, guards
    │   ├── pages/
    │   ├── components/ui/
    │   ├── components/layout/
    │   ├── features/
    │   ├── api/
    │   ├── store/
    │   ├── lib/
    │   └── styles/
    ├── package.json
    └── .env.example
```

## 7. Build Phases

1. ✅ Foundation + auth (backend/frontend skeleton, JWT login for both
   roles, RBAC guards, rate limiting).
2. ✅ Customer CRUD, search (mobile/DOB/card ID), today's card.
3. ✅ Card PDF + QR generation, printing log, public card-status page.
4. ✅ Admin modules: partners, hospitals, locations, printing reports,
   cross-partner customer overview with CSV export.
5. ✅ Profile/password polish, tests, seed data, migrations, full React
   frontend (design system + all 18 screens), final consistency pass.

All phases are implemented. See the root `README.md` for setup/run
instructions and `backend/tests/` for the automated test suite (31 tests
covering card ID/validity logic, partner-scoping guarantees, auth flows,
and the customer/card/admin API surface).

### Frontend notes

- Route guards (`RequirePartner`, `RequireAdmin`, `RedirectIfAuthenticated`)
  check the decoded scope from the in-memory auth store, not just "is a
  token present" — a partner access token cannot render admin screens even
  if manually placed in the store.
- The "Today's Card" screen is driven by `card_print_logs` (print events on
  the current date), matching the doc's §4.6/§3.3 routing to
  `GET /cards/today` rather than `GET /customers/today` (which still exists
  and is used nowhere in the UI, kept only because the doc documents it as a
  distinct endpoint).
- The physical card's "Registration Fee ₹60/-" box is reproduced on the
  generated PDF as a static cosmetic label only — it is not a stored field
  or a payment feature, since no such business rule appears in the source
  documentation.
- Hindi labels are reproduced verbatim where the screenshots show them
  (Add Customer, Find Card, Customer Detail, list rows); the printed PDF
  card is English-only, since no Devanagari font asset was provided to
  embed in the server-side PDF renderer.
