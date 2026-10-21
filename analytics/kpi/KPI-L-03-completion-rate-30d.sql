-- KPI-L-03 Completion rate, 30 days (leading, layer 1 — ADR-0005)
-- Definition: docs/measurement/kpi-and-instrumentation-plan.md
-- Completed events logged in the 30 days ending at :period_end, divided by
-- entries added to a list in the same window. A rate, not a cohort: it shows
-- whether people move items to done, not whether the same items finish.
-- Usage: psql "$KPI_READONLY_URL" -v period_end="'2026-11-20'" -f this-file

WITH params AS (
  -- :period_end is a Bangkok-local date or time; Prisma stores UTC in
  -- `timestamp` columns without a zone, so convert once and compare in UTC
  -- (independent of the session TimeZone).
  SELECT ((:period_end)::timestamp AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'UTC' AS period_end
),
window_log AS (
  SELECT a."action"
  FROM "ActivityLog" a, params p
  WHERE a."createdAt" >  p.period_end - INTERVAL '30 days'
    AND a."createdAt" <= p.period_end
)
SELECT
  (SELECT period_end FROM params)                                                     AS period_end_utc,
  (SELECT count(*) FROM window_log WHERE "action" IN ('added_to_list', 'created_item')) AS entries_added,
  (SELECT count(*) FROM window_log WHERE "action" = 'completed')                       AS entries_completed,
  CASE WHEN (SELECT count(*) FROM window_log WHERE "action" IN ('added_to_list', 'created_item')) < 20 THEN NULL
       ELSE round(100.0 * (SELECT count(*) FROM window_log WHERE "action" = 'completed')
                        / (SELECT count(*) FROM window_log WHERE "action" IN ('added_to_list', 'created_item')), 1)
  END                                                                                 AS completion_rate_pct;
