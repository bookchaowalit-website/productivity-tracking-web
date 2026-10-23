# Analytics

Pilot of [ADR-0005 — product analytics standard](https://github.com/bookchaowalit/architecture-docs/blob/main/docs/architecture/decisions/ADR-0005-product-analytics-standard.md).
Metric definitions live only in [`docs/measurement/KPI-PLAN.md`](../docs/measurement/KPI-PLAN.md);
files here implement them.

| Layer | What | Where |
|---|---|---|
| 1 — system of record | KPIs computed by SQL from this app's database | `kpi/<KPI-ID>-*.sql` |
| 2 — product analytics | Server-side events to PostHog Cloud EU ([SPEC-001](../specs/001-product-analytics/spec.md)); consent-gated browser events (W4 pilot) | `src/lib/analytics.ts` (server), `src/lib/browser-analytics.ts` + `posthog-adapter.ts` (browser); all off until `NEXT_PUBLIC_ANALYTICS_ENABLED=true` and a key |
| Dashboards | PostHog insights as HogQL, created by hand once the key exists | `posthog/dashboard.json` |
| 3 — page analytics | Existing Vercel Web Analytics + Speed Insights (cookieless) | `src/app/layout.tsx` — kept as TrackIt's page layer (owner, 2026-10-21; ADR-0005 D-7 exception) |

## Running a layer-1 query

1. Use a role that can only `SELECT` the tables named in the query (no
   `password`, `email`, `name`, `image` columns are read by any query here).
   The connection string comes from Infisical, never from a committed file.
2. Set a timeout and pass the period end:

```bash
PGOPTIONS="-c statement_timeout=30s" psql "$KPI_READONLY_URL" \
  -v period_end="'2026-11-20'" -f analytics/kpi/KPI-O-01-weekly-active-trackers.sql
```

`period_end` is a Bangkok-local date (midnight Asia/Bangkok). The queries
convert it to UTC because Prisma stores UTC in zone-less `timestamp` columns,
so the result does not depend on the session `TimeZone`.

3. Paste the single result row (counts and percentage only) into the outcome
   review. A `NULL` percentage means the population is below the minimum
   volume of 20 and the KPI is `not measurable` for that period.

## Verification

2026-10-21: all three queries were run against an in-memory Postgres
(PGlite 0.5.11) built from `prisma migrate diff --from-empty
--to-schema-datamodel prisma/schema.prisma`, with seeded rows. Expected counts
matched (e.g. 10 of 47 eligible users active → 21.3%; 6 of 30 added entries
completed → 20.0%), and results were identical with the session time zone set
to `America/New_York`. Not yet run against the production database (owner
action A-2).
