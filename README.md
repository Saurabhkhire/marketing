# Marketing platform (demo)

React (Vite) frontend and Node.js (Express) API with Prisma ORM.

## Prerequisites

- Node.js 20+

## Setup

From the repo root:

```powershell
npm install
Copy-Item server\.env.example server\.env
npm run db:migrate -w server
npm run db:seed -w server
```

## Run API + SPA together

```powershell
npm run dev
```

- **Frontend:** http://localhost:5173 (proxies `/api` to the backend)
- **API:** http://localhost:4000

Optional: create `server\.env` with `APIFY_TOKEN=` from [Apify integrations](https://console.apify.com/account/integrations) for a merged live actor list.

## Documentation

| Doc | Contents |
| --- | -------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Use cases and logical architecture |
| [docs/AGENTS.md](docs/AGENTS.md) | Agents, workflows, architecture diagrams |
| [docs/WORKFLOWS.md](docs/WORKFLOWS.md) | End-to-end workflows |
| [docs/TECH_FLOW.md](docs/TECH_FLOW.md) | Files and handlers (one-line map) |
| [docs/DATABASE.md](docs/DATABASE.md) | SQLite locally; Supabase / Neon for Postgres |
| [docs/SPONSORS_AND_APIFY.md](docs/SPONSORS_AND_APIFY.md) | Sponsor model + Apify actors / websites |
| [docs/TEST_CASES.md](docs/TEST_CASES.md) | Positive / negative API & UI checks |

## Tests

```powershell
npm run test -w server
npm run test -w client
```

RocketRide scaffolding was removed from this repository in favor of the stack above.
# marketing
