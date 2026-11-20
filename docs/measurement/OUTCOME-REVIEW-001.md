---
title: TrackIt — Outcome Review 001 (T+30)
status: draft
created: 2026-10-23
updated: 2026-11-20
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
| Version | 0.2 |
| Release(s) covered | Production redeploy of `fa13f95` with analytics on (dpl_Co5YsP3eWZdz3pu6xYaByX5fBA9y, 2026-10-26) |
| Review period | 2026-10-26 – 2026-11-25 |
| Review type | T+30 |
| Status | review-ready (data filled 2026-11-20 from PostHog; owner decision pending, due 2026-11-25) |
| Owner | Owner (bookchaowalit) |
| AI maker | Claude Code (session w4c-loop-pilot) prepared the empty review |
| AI reviewer | Fresh read-only Claude reviewer at review time |
| KPI plan version | [KPI-PLAN.md](KPI-PLAN.md) v0.2 |
| Data snapshot | PostHog insight exports from `analytics/posthog/dashboard.json` and layer-1 SQL rows from `analytics/kpi/` — aggregates only |
| Previous review | none (first review) |
| Phase gate record | G11 record — fill in at review |
| Due | 2026-11-25 (go-live 2026-10-26 + 30 days) |

## Summary

Data snapshot: PostHog project 318524 (EU), HogQL over `events` from 2026-10-20 to 2026-11-20 03:30 UTC; live bundles checked the same day.

| Objective | Outcome KPI | Verdict | One-line reason |
|---|---|---|---|
| OBJ-01 | KPI-O-01 (north star) | not measurable | 1 PostHog event in 30 days (go-live test pageview 2026-10-25); layer-1 SQL not run yet |

Overall decision (proposed, owner to confirm): **not measurable → extend** — keep the KPIs, run
the layer-1 SQL once, and move the first real baseline to OR-102 at T+60 (2026-12-25).


## KPI results

| KPI ID | Type | Baseline | Target (by date) | Previous review | This period | Change vs baseline | Status | Data quality note |
|---|---|---|---|---|---|---|---|---|
| KPI-O-01 | outcome (north star) | not yet measured | ≥ 40%, go-live + 90 days (provisional) | — | not run | — | not measurable | Layer-1 SQL needs the read-only role (A-2); run before the owner decision |
| KPI-L-01 | leading | not yet measured | ≥ 50%, go-live + 90 days (provisional) | — | not run | — | not measurable | Same as KPI-O-01 |
| KPI-L-02 | leading | not yet measured | ≥ 3 / user / week, go-live + 90 days (provisional) | — | 0 `tracking_updated` | — | not measurable | Below 20 active users |
| KPI-L-03 | leading | not yet measured | ≥ 20%, go-live + 90 days (provisional) | — | not run | — | not measurable | Layer-1 SQL |
| KPI-L-04 | leading | not yet measured | ≥ 30%, go-live + 90 days (provisional) | — | 1 `$pageview`, 0 `collection_filtered` | — | not measurable | Below 20 consented visitors |
| KPI-G-01 | guardrail | not yet measured | ≤ 2% | — | 0 writes, 0 `tracking_write_failed` | — | not measurable | Below 100 writes |

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
| 1 | (proposed) Run the layer-1 SQL (KPI-O-01, L-01, L-03) with the read-only role and paste the rows here | backlog item | Claude | 2026-11-25 | outcome-review/OR-101#1 |
| 2 | (proposed) Keep all KPIs; take the baseline at OR-102 (T+60, 2026-12-25) | KPI definition change | Owner | 2026-11-25 | outcome-review/OR-101#2 |
| 3 | (proposed) Add a cookieless traffic count (Vercel Web Analytics or edge request count) so "no visitors" and "no consent" can be told apart | discovery question | Owner | 2026-12-05 | outcome-review/OR-101#3 |

Continuous discovery: open questions from this review go here.

- Does TrackIt have any real user besides the owner? → owner, answer in OR-102
- Is consent acceptance the bottleneck (banner shown, never accepted)? → decision #3
## Approval and sign-off

| Decision | Approver | Date | Evidence |
|---|---|---|---|
| accept review and decisions | Owner | — | — |
| next review scheduled (OR-102, T+60) | Owner | — | task `outcome-review/trackit/<date>` |
