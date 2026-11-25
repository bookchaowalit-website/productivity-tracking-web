---
title: TrackIt — Outcome Review 001 (T+30)
status: decided
created: 2026-10-23
updated: 2026-11-26
description: First outcome review of the TrackIt KPI pilot, prepared before go-live. Due 30 days after the first production event; status stays "pending" until then (go-live 2026-10-26). Read by empire-backlog-sync once its status is "decided".
---

# TrackIt — Outcome Review 001 (T+30)

Prepared from architecture-docs `templates/sdlc/outcome-review.md`. When this
review is `decided`, `empire-backlog-sync` turns each row of "Decisions and
actions" into one task in tasks-api with key `outcome-review/OR-101#<row>`
(architecture-docs `docs/lifecycle/OUTCOME-REVIEW-TO-BACKLOG.md`). Review IDs
are unique across products because the key has no repository in it: TrackIt
uses OR-101…OR-199.

## Document control

| Field | Value |
|---|---|
| Review ID | OR-101 |
| Project / product ID | TrackIt (`bookchaowalit-website/productivity-tracking-web`) |
| Version | 1.0 |
| Release(s) covered | Production redeploy of `fa13f95` with analytics on (dpl_Co5YsP3eWZdz3pu6xYaByX5fBA9y, 2026-10-26) |
| Review period | 2026-10-26 – 2026-11-25 |
| Review type | T+30 |
| Status | decided 2026-11-26 (owner accepted all proposed decisions) |
| Owner | Owner (bookchaowalit) |
| AI maker | Claude Code (session w4c-loop-pilot) prepared the empty review |
| AI reviewer | Fresh read-only Claude reviewer at review time |
| KPI plan version | [KPI-PLAN.md](KPI-PLAN.md) v0.2 |
| Data snapshot | PostHog insight exports from `analytics/posthog/dashboard.json` and layer-1 SQL rows from `analytics/kpi/` — aggregates only |
| Previous review | none (first review) |
| Phase gate record | G11 record — fill in at review |
| Due | 2026-11-25 (go-live 2026-10-26 + 30 days) |

## Summary

Data snapshot: PostHog project 318524 (EU), HogQL over `events` from 2026-10-20 to 2026-11-25 17:00 UTC (full period); live bundles checked 2026-11-20.

| Objective | Outcome KPI | Verdict | One-line reason |
|---|---|---|---|
| OBJ-01 | KPI-O-01 (north star) | off-track | Database: 0 tracking writes in the period (2 users ever, last write 2026-10-24); PostHog: 1 test pageview |

Overall decision (owner accepted 2026-11-26): **not used → decide the product's role** — the
database shows no use at all in the period, so empty PostHog data is not a consent problem. Either
keep TrackIt as a portfolio demo and stop its KPI loop, or find real users before OR-102.


## KPI results

| KPI ID | Type | Baseline | Target (by date) | Previous review | This period | Change vs baseline | Status | Data quality note |
|---|---|---|---|---|---|---|---|---|
| KPI-O-01 | outcome (north star) | 0 active / 2 users (every week) | ≥ 40%, go-live + 90 days (provisional) | — | 0 users with a write in any week | — | not measurable (below 20 users) | Run 2026-11-25 against the tracking cell DB, counts only, read-only session (see note) |
| KPI-L-01 | leading | not yet measured | ≥ 50%, go-live + 90 days (provisional) | — | 0 new users | — | not measurable | No user started in the period |
| KPI-L-02 | leading | not yet measured | ≥ 3 / user / week, go-live + 90 days (provisional) | — | 0 `tracking_updated` | — | not measurable | Below 20 active users |
| KPI-L-03 | leading | not yet measured | ≥ 20%, go-live + 90 days (provisional) | — | 0 items finished | — | not measurable | |
| KPI-L-04 | leading | not yet measured | ≥ 30%, go-live + 90 days (provisional) | — | 1 `$pageview`, 0 `collection_filtered` | — | not measurable | Below 20 consented visitors |
| KPI-G-01 | guardrail | not yet measured | ≤ 2% | — | 0 writes, 0 `tracking_write_failed` | — | not measurable | Below 100 writes |

Layer-1 run 2026-11-25: the SQL in `analytics/kpi/` targets the old Prisma schema (`"User"`,
`"UserTracking"`); data now lives in the tracking cell (`tracking.user_tracking`,
`tracking.activity_log`, no user table). The same definitions were run as counts-only queries in a
read-only session with the cell's API role, because no KPI read-only role exists yet (A-2). Weekly
result for 2026-10-26 … 2026-11-23: 0 users with a write, 0 rows updated, 0 activity-log rows, 0
items finished; 2 users and 17 tracking rows in total, last write 2026-10-24.

Instrumentation check 2026-11-20: tracking.bookchaowalit.com answers 200 and 2 of its 10 JS
bundles carry the PostHog project key, so the client is deployed; events only flow after a
visitor accepts the consent banner. With no server-side traffic count, "no visitors" and "no one
accepted consent" cannot be told apart from this data.

## Attribution

| KPI ID | Evidence type | Confidence | Other possible causes checked |
|---|---|---|---|
| all | before-after only (first period is the baseline) | low | — |

## Qualitative signals

| Source | Volume this period | Top themes | Link |
|---|---|---|---|
| GitHub issues (autopilot backlog) | not collected in this pass | — | — |
| Sentry errors (`personal-yu0`) | not collected in this pass | — | — |

## Decisions and actions

Filled in at the review. Allowed types: backlog item, experiment, discovery
question, KPI definition change, retire feature, change request, roadmap
change. One action per row; write the task key or issue into "Tracked in".

| # | Decision | Type | Owner | Due | Tracked in |
|---|---|---|---|---|---|
| 1 | Rewrite `analytics/kpi/*.sql` for the tracking cell schema (layer-1 counts were run by hand 2026-11-25, see KPI results) | backlog item | Claude | 2026-12-05 | outcome-review/OR-101#1 |
| 2 | Keep TrackIt as a portfolio demo: stop the KPI loop after this review (no OR-102) unless real users appear | roadmap change | Owner | 2026-11-30 | outcome-review/OR-101#2 |
| 3 | Add a cookieless traffic count (Vercel Web Analytics or edge request count) so "no visitors" and "no consent" can be told apart | discovery question | Owner | 2026-12-05 | outcome-review/OR-101#3 |

Continuous discovery: open questions from this review go here.

- Does TrackIt have any real user besides the owner? → answered 2026-11-25: no use in the period (database)
- Is consent acceptance the bottleneck (banner shown, never accepted)? → decision #3
## Approval and sign-off

| Decision | Approver | Date | Evidence |
|---|---|---|---|
| accept review and decisions | Owner | 2026-11-26 | owner reply in the Claude Code session, 2026-11-26 ("ตามข้อเสนอ") |
| next review scheduled (OR-102, T+60) | Owner | 2026-11-26 | not scheduled: decision #2 stops the KPI loop unless real users appear |
