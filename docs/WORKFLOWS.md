# Workflows and logic

## 1. Sponsor discovery

1. Client loads **Sponsors** → `fetch("/api/sponsors")` (proxied to `GET /api/sponsors`).
2. Server reads all `Sponsor` rows ordered by `tier`, then `name`.
3. Prisma attaches `_count.campaigns` per sponsor.
4. UI renders tier badge, monthly budget (if set), Apify lab flag, and external website link.

**Logic:** inactive sponsors are still returned (demo); production could filter `where: { active: true }`.

## 2. Campaign portfolio

1. Client loads **Campaigns** → `GET /api/campaigns`.
2. Optional query `?status=ACTIVE` filters `Campaign.status`.
3. Each row includes related `sponsor` (nullable for organic campaigns).

**Logic:** budgets are stored as **integer cents** in the API (`budgetCents`). The UI divides by 100 for dollars.

## 3. Apify actor catalog

1. Client loads **Apify lab** → `GET /api/apify/actors`.
2. Server starts from a **static catalog** (`APIFY_STORE_CATALOG`) — actor IDs and canonical `https://apify.com/{username}/{name}` URLs.
3. If `APIFY_TOKEN` is set, server calls Apify REST endpoints (`/v2/acts`, `/v2/store`) and **merges** unique actors into the response by actor ID.

**Logic:** without a token, response `source` is `catalog` and a message explains how to enable live data. Duplicate IDs collapse into one row.

## 4. Create sponsor (API)

1. `POST /api/sponsors` with JSON validated by Zod (`slug` must match `^[a-z0-9-]+$`).
2. Prisma `create`; unique slug violation → HTTP **409**.

## 5. Create campaign (API)

1. `POST /api/campaigns` with ISO datetime strings for optional `startDate` / `endDate`.
2. Invalid `sponsorId` foreign key → HTTP **400** (`P2003`).

## 6. Local development bootstrap

1. Copy `server/.env.example` → `server/.env`.
2. `prisma migrate deploy` applies SQLite migration.
3. `prisma/seed.ts` wipes and inserts demo sponsors + campaigns.
