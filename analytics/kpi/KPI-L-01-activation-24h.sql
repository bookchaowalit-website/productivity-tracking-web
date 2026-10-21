-- KPI-L-01 Activation within 24 hours (leading, layer 1 — ADR-0005)
-- Definition: docs/measurement/kpi-and-instrumentation-plan.md
-- Of users who signed up in the 30 days ending at :period_end (and at least
-- 24 hours before it), the share who added a first tracking entry within 24
-- hours of sign-up. Returns counts only.
-- Usage: psql "$KPI_READONLY_URL" -v period_end="'2026-11-20'" -f this-file

WITH params AS (
  -- :period_end is a Bangkok-local date or time; Prisma stores UTC in
  -- `timestamp` columns without a zone, so convert once and compare in UTC
  -- (independent of the session TimeZone).
  SELECT ((:period_end)::timestamp AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'UTC' AS period_end
),
cohort AS (
  SELECT u."id", u."createdAt"
  FROM "User" u, params p
  WHERE u."createdAt" >  p.period_end - INTERVAL '30 days'
    AND u."createdAt" <= p.period_end - INTERVAL '24 hours'
),
activated AS (
  SELECT c."id"
  FROM cohort c
  WHERE EXISTS (
    SELECT 1 FROM "UserTracking" ut
    WHERE ut."userId" = c."id"
      AND ut."createdAt" <= c."createdAt" + INTERVAL '24 hours'
  )
)
SELECT
  (SELECT period_end FROM params) AS period_end_utc,
  (SELECT count(*) FROM cohort)    AS new_users,
  (SELECT count(*) FROM activated) AS activated_users,
  CASE WHEN (SELECT count(*) FROM cohort) < 20 THEN NULL
       ELSE round(100.0 * (SELECT count(*) FROM activated) / (SELECT count(*) FROM cohort), 1)
  END                              AS activation_24h_pct;
