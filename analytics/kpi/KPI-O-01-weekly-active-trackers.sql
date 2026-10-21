-- KPI-O-01 Weekly active trackers (outcome, layer 1 — ADR-0005)
-- Definition: docs/measurement/kpi-and-instrumentation-plan.md
-- Share of eligible users (signed up at least 7 days before the period end)
-- who created or updated at least one tracking entry in the 7 days ending at
-- :period_end. Returns counts only — no user IDs leave the database.
-- Run with a read-only role; set statement_timeout before running.
-- Usage: psql "$KPI_READONLY_URL" -v period_end="'2026-11-20'" -f this-file

WITH params AS (
  -- :period_end is a Bangkok-local date or time; Prisma stores UTC in
  -- `timestamp` columns without a zone, so convert once and compare in UTC
  -- (independent of the session TimeZone).
  SELECT ((:period_end)::timestamp AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'UTC' AS period_end
),
eligible AS (
  SELECT u."id"
  FROM "User" u, params p
  WHERE u."createdAt" <= p.period_end - INTERVAL '7 days'
),
active AS (
  SELECT DISTINCT ut."userId"
  FROM "UserTracking" ut, params p
  WHERE ut."updatedAt" >  p.period_end - INTERVAL '7 days'
    AND ut."updatedAt" <= p.period_end
)
SELECT
  (SELECT period_end FROM params)                                        AS period_end_utc,
  (SELECT count(*) FROM eligible)                                        AS eligible_users,
  (SELECT count(*) FROM eligible e JOIN active a ON a."userId" = e."id") AS active_users,
  CASE WHEN (SELECT count(*) FROM eligible) < 20 THEN NULL               -- below minimum volume: not measurable
       ELSE round(100.0 * (SELECT count(*) FROM eligible e JOIN active a ON a."userId" = e."id")
                        / (SELECT count(*) FROM eligible), 1)
  END                                                                    AS weekly_active_pct;
