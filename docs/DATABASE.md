# Database structure

ORM: **Prisma**. Schema file: `server/prisma/schema.prisma`.

## Entities

### `Sponsor`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `TEXT` (cuid) | Primary key |
| `name` | string | Display name |
| `slug` | string | Unique URL key (`^[a-z0-9-]+$`) |
| `tier` | enum | `PLATINUM`, `GOLD`, `SILVER`, `BRONZE`, `COMMUNITY` |
| `logoUrl` | string? | Optional avatar URL |
| `website` | string | Sponsor homepage |
| `description` | string | Markdown-free blurb |
| `fundsApifyLab` | boolean | Marks underwriting of Apify scraping experiments |
| `monthlyBudgetUsd` | int? | Optional monthly sponsorship budget (USD, whole dollars) |
| `active` | boolean | Soft flag for future filtering |
| `createdAt`, `updatedAt` | datetime | Audit |

### `Campaign`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `TEXT` (cuid) | Primary key |
| `title`, `description` | string | Campaign copy |
| `status` | enum | `DRAFT`, `ACTIVE`, `PAUSED`, `COMPLETED` |
| `budgetCents` | int | Budget in **cents** |
| `startDate`, `endDate` | datetime? | Optional window |
| `sponsorId` | string? | FK → `Sponsor.id`, `SET NULL` on delete |
| `createdAt`, `updatedAt` | datetime | Audit |

## Local (SQLite)

`.env`:

```
DATABASE_URL="file:./dev.db"
```

Commands from repo root:

```
npm run db:migrate -w server
npm run db:seed -w server
```

## Deploy — Supabase or Neon (PostgreSQL)

Both providers expose a **PostgreSQL connection string**. Steps:

1. Create a Postgres database and copy its URL (often includes `?sslmode=require`).
2. In `server/prisma/schema.prisma`, switch the datasource:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Set `DATABASE_URL` in your hosting environment to the Neon or Supabase connection string.
4. Run migrations against production:

```
cd server
npx prisma migrate deploy
```

5. Optionally run `npx prisma db seed` once for demo content (avoid re-seeding production repeatedly).

### Provider notes

- **Neon**: serverless Postgres; connection string from the Neon console.
- **Supabase**: Postgres under “Project settings → Database”; use the **URI** format compatible with Prisma (`sslmode` often required).

SQLite-specific migrations in this repo target local dev only; when moving to Postgres, generate a fresh migration history or use `prisma migrate diff` against an empty Postgres instance — treat this project as a **demo** and plan a proper migration strategy before production data.
