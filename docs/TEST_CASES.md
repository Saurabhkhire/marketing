# Test cases

Automated checks live in:

- `server/src/api.test.ts` — Vitest + Supertest (`npm run test -w server`)
- `client/src/App.test.tsx` — React smoke test (`npm run test -w client`)

Below: **manual** matrices for demos and QA (positive / negative, API vs UI).

## API — positive

| ID | Endpoint | Preconditions | Steps | Expected |
| --- | --- | --- | --- | --- |
| A-P1 | `GET /api/health` | Server running | `curl http://localhost:4000/api/health` | `200`, body `ok: true`, ISO `ts` |
| A-P2 | `GET /api/sponsors` | DB migrated + seeded | GET | `200`, non-empty array, `_count.campaigns` present |
| A-P3 | `GET /api/sponsors/northwind-ventures` | Seed applied | GET | `200`, sponsor with campaigns array |
| A-P4 | `GET /api/campaigns` | Seed applied | GET | `200`, rows include `sponsor` relation |
| A-P5 | `GET /api/campaigns?status=ACTIVE` | Seed applied | GET | All returned rows have `status=ACTIVE` |
| A-P6 | `POST /api/sponsors` | Valid JSON | POST body with unique `slug` | `201`, echo created row |
| A-P7 | `POST /api/campaigns` | Known `sponsorId` from seed | POST with ISO dates | `201`, sponsor attached |
| A-P8 | `GET /api/apify/actors` | None / optional token | GET | `200`, `actors` array, `source` `catalog` or `apify+catalog` |

## API — negative

| ID | Endpoint | Steps | Expected |
| --- | --- | --- | --- |
| A-N1 | `GET /api/sponsors/unknown-slug` | GET | `404`, `{ error }` |
| A-N2 | `POST /api/sponsors` | Omit `website` or invalid `slug` (uppercase) | `400`, Zod `fieldErrors` |
| A-N3 | `POST /api/sponsors` | Duplicate `slug` | `409` |
| A-N4 | `POST /api/campaigns` | Random non-existent `sponsorId` | `400`, invalid FK message |
| A-N5 | `POST /api/campaigns` | Malformed JSON body | `400` or `500` depending on middleware (send invalid types) |

## UI — positive

| ID | Page | Steps | Expected |
| --- | --- | --- | --- |
| U-P1 | Overview | Open `/` | Health card shows API response or clear error |
| U-P2 | Sponsors | Open `/sponsors` | Table lists six seeded sponsors with tiers |
| U-P3 | Campaigns | Open `/campaigns` | Budgets shown in dollars derived from cents |
| U-P4 | Apify lab | Open `/apify` | Table lists catalog actors with external links |

## UI — negative

| ID | Page | Steps | Expected |
| --- | --- | --- | --- |
| U-N1 | Any | Stop API only, keep Vite | Red / error message on data pages (fetch failure) |
| U-N2 | Campaigns | Break proxy (wrong port) | Error text from failed `fetchJson` |

## Future automation (optional)

- Playwright against `npm run dev` for U-P* cases.
- Contract tests for JSON shapes (e.g. Zod on client or OpenAPI).
