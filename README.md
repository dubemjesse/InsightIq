# InsightIQ

**Intelligence that moves with you**

An AI-powered Business Intelligence agent: connect your data, ask questions in
plain English, and get instant SQL-backed answers, dashboards, and proactive
insights — powered by Claude.

## Status — all 7 phases complete

- [x] **Phase 1** — Project setup
- [x] **Phase 2** — Authentication & user management (JWT, RBAC)
- [x] **Phase 3** — Database connector module (Postgres/MySQL/SQLite/CSV/Excel)
- [x] **Phase 4** — AI natural-language-to-SQL engine (Claude)
- [x] **Phase 5** — Interactive dashboard builder (charts, drag-and-drop, export)
- [x] **Phase 6** — Insights & anomaly detection (scheduled scan, email digest)
- [x] **Phase 7** — Admin panel, responsive polish, Docker, deploy config

## Features

- **Auth & roles** — JWT-based signup/login, three roles (`ADMIN`, `ANALYST`,
  `VIEWER`) enforced on every protected route, not just hidden in the UI.
- **Data connectors** — Connect live PostgreSQL or MySQL databases, or upload
  CSV / Excel / SQLite files. Uploads are parsed and materialized into a local
  SQLite file per data source (type-inferred columns) so they can be queried
  with real SQL exactly like a live database. Credentials are encrypted at
  rest (AES-256-GCM).
- **Ask AI** — Type a question in plain English; Claude writes the SQL (via
  structured outputs, not fragile text parsing), the app runs it against your
  data, and shows results as a table with the generated query and a
  plain-English explanation. All generated and user-supplied SQL is restricted
  to read-only `SELECT`/`WITH` statements before it ever touches a database.
- **Dashboards** — Save any query result as a chart (Bar/Line/Pie/Area/Table —
  auto-suggested from the data's shape, or pick manually), arrange widgets on
  a drag-and-drop grid, and export the whole dashboard as PNG or PDF.
- **Insights engine** — A daily scheduled job scans every user's data sources
  for statistically significant trends and anomalies (z-score outliers,
  period-over-period swings), has Claude turn the raw numbers into a
  plain-English write-up, surfaces the results on the home dashboard, and
  emails a digest if SMTP is configured.
- **Admin panel** — User list with inline role/active-status management,
  platform-wide usage stats, and oversight of every connected data source
  across all users.

## Tech stack

| Layer    | Choice                                                              |
| -------- | -------------------------------------------------------------------- |
| Frontend | React (Vite), Tailwind CSS v4, React Router, React Query, Recharts, react-grid-layout |
| Backend  | Node.js, Express 5, Prisma ORM, PostgreSQL                          |
| AI       | Anthropic Claude API (`claude-opus-4-8` by default) — NL→SQL and insight narration |
| Auth     | JWT (httpOnly cookie + bearer header support), bcrypt password hashing |
| Jobs     | node-cron (daily insight scan), Nodemailer (digest email)            |
| DevOps   | Docker (multi-stage builds), Docker Compose, Render blueprint         |

## Project structure

```
insightiq/
├── client/                       # React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── admin/            # Admin panel tables/stat cards
│       │   ├── dashboard/        # ChartWidget, widget cards, modals
│       │   ├── dataSources/      # Connect/upload modals, source cards
│       │   ├── layout/           # Navbar (incl. mobile menu)
│       │   └── ui/               # Button, Input, Modal, ErrorBoundary...
│       ├── pages/
│       ├── hooks/
│       ├── context/
│       └── utils/                # api client, chart color palette, chart-type suggestion
├── server/                       # Node/Express backend
│   ├── controllers/
│   ├── routes/
│   ├── middleware/                # auth, upload, validation, error handling
│   ├── prisma/                    # schema + migrations
│   ├── services/
│   │   ├── aiAgent.js             # NL → SQL (Claude, structured outputs)
│   │   ├── insightsEngine.js      # statistical detection + AI narration
│   │   ├── dataSource.service.js  # connect/introspect/run query (+ read-only guard)
│   │   ├── fileImport.service.js  # CSV/Excel/SQLite → materialized SQLite
│   │   └── emailService.js        # Nodemailer digest
│   ├── jobs/insightsScan.job.js   # daily cron (06:00) across all users
│   ├── config/                    # env, prisma client, shared Anthropic client
│   └── Dockerfile
├── client/Dockerfile
├── docker-compose.yml             # Postgres + server + client, wired together
├── render.yaml                    # Render Blueprint (see Deployment below)
└── README.md
```

## Getting started (local development)

### Prerequisites

- Node.js 20+
- A running PostgreSQL instance — local install, or `docker compose up -d postgres`

### 1. Backend

```bash
cd server
cp .env.example .env      # fill in JWT_SECRET, ENCRYPTION_KEY (see below), etc.
npm install
npx prisma migrate dev --name init
npm run dev                # http://localhost:5000
```

`GET /api/health` should return `{ "status": "ok", "database": "connected" }`.

### 2. Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev                # http://localhost:5173 (or next free port)
```

## Environment variables

Full list in `server/.env.example` and `client/.env.example`. The ones that
need a real value before the app will boot or fully work:

| Variable | Required for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Server to boot at all | Postgres connection string |
| `JWT_SECRET` | Server to boot at all | Any long random string |
| `ENCRYPTION_KEY` | Server to boot at all | **Exactly 64 hex chars.** Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ANTHROPIC_API_KEY` | Ask AI, insight narration | Without it, those features return a clear "not configured" error instead of crashing; everything else still works |
| `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` | Daily email digest | Without it, the insight scan still runs and saves insights — it just skips sending mail (logged, not fatal) |
| `VITE_API_URL` (client) | Frontend to reach the API | Defaults to `http://localhost:5000/api` |

## Roles

- **ADMIN** — everything, plus the Admin panel (user/role management, platform stats, all-data-source oversight).
- **ANALYST** — connect/manage data sources, ask questions, build dashboards.
- **VIEWER** — read-only: browse and preview data sources and dashboards, but cannot create/edit/delete connections.

Data sources, dashboards, and saved queries are scoped to the user who created
them; the Admin panel is the only cross-user view (by design, for Phase 7).

## Running with Docker

```bash
cp server/.env.example server/.env   # fill in the required values above
docker compose up -d --build
```

This starts Postgres, the API (`http://localhost:5000`), and the frontend
(`http://localhost:5173`, served via nginx) wired together on one network.
Uploaded files persist in a named volume across restarts.

> Note: the Dockerfiles follow standard multi-stage Node/Alpine + nginx
> patterns but haven't been build-tested in this environment (no Docker
> daemon available here) — worth a first `docker compose up --build` check
> before relying on it.

## Deployment

**Render** — `render.yaml` in the repo root is a ready-to-use
[Blueprint](https://render.com/docs/blueprint-spec): push to GitHub, then in
the Render dashboard choose **New → Blueprint** and point it at the repo. It
provisions a managed Postgres, the API, and the static frontend. After the
first deploy, set the secrets marked `sync: false` in the dashboard
(`ENCRYPTION_KEY`, `ANTHROPIC_API_KEY`, SMTP credentials) — they're
intentionally not committed to the repo.

**Railway** — no committed config needed: create two services from this
repo (one rooted at `/server`, one at `/client`), Railway auto-detects each
`Dockerfile`; add a Postgres plugin and copy its connection string into
`DATABASE_URL`; set the same env vars as above on the server service, and
`VITE_API_URL` as a build arg on the client service pointing at the server's
public URL.

## Design language

- **Colors**: Deep navy `#03122A`, Electric blue `#378ADD`, Accent green `#97C459`
- **Font**: Inter
- **Style**: Dark-mode first, clean and minimal
- **Charts**: a validated, CVD-safe categorical palette built from the brand
  colors (see `client/src/utils/chartColors.js`) — chart series use a
  slightly deepened step of the accent green, since the full-brightness UI
  green is too light to read well as a data mark on the navy surface.

## Author

- **Jesse Odoh**
