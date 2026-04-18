# Technical flow — files and entry points

Convention: `#` denotes a one-line description of the symbol or route.

## Root

| Path | Purpose |
| --- | --- |
| `package.json` # workspaces + `npm run dev` orchestration | Runs API and SPA via `concurrently` |
| `README.md` # quickstart | Install, migrate, seed, dev URL |

## Server (`server/`)

| Path | Purpose |
| --- | --- |
| `src/index.ts` # Express app bootstrap | Registers CORS, JSON body, routes, error middleware; listens unless `NODE_ENV=test` |
| `src/index.ts` # `GET /api/health` | Liveness JSON with timestamp |
| `src/lib/prisma.ts` # `prisma` singleton | Shared Prisma client for hot reload safety |
| `src/routes/sponsors.ts` # `sponsorsRouter` | Sponsor CRUD subset: list, get by slug, create |
| `src/routes/campaigns.ts` # `campaignsRouter` | Campaign list with optional status filter; get by id; create |
| `src/routes/apify.ts` # `apifyRouter` | Merges static Apify catalog with optional live API calls |
| `src/routes/apify.ts` # `APIFY_STORE_CATALOG` | Demo list of Store actor IDs and documentation URLs |
| `prisma/schema.prisma` # models `Sponsor`, `Campaign` | SQLite datasource; enums for tier and campaign status |
| `prisma/seed.ts` # `main` | Demo sponsors and campaigns for SQLite |
| `src/api.test.ts` # Vitest + Supertest | API regression tests against temp SQLite file |

## Client (`client/`)

| Path | Purpose |
| --- | --- |
| `vite.config.ts` # dev proxy | Forwards `/api` to `localhost:4000` |
| `src/main.tsx` # React root | Mounts router + `App` |
| `src/App.tsx` # routes | Declares Overview, Sponsors, Campaigns, Apify lab |
| `src/api.ts` # `fetchJson` | Typed fetch with optional `VITE_API_URL` prefix |
| `src/pages/HomePage.tsx` # health probe | Calls `/api/health` on mount |
| `src/pages/SponsorsPage.tsx` # sponsor table | Consumes `/api/sponsors` |
| `src/pages/CampaignsPage.tsx` # campaign table | Consumes `/api/campaigns` |
| `src/pages/ApifyPage.tsx` # actor table | Consumes `/api/apify/actors` |
| `src/App.test.tsx` # smoke test | Ensures navigation labels render |

## Runtime ports

| Process | Default port |
| --- | --- |
| Vite dev server | 5173 |
| Express API | 4000 |
