---
title: TrackIt — Outcome Review 001 (T+30)
status: draft
created: 2026-10-23
updated: 2026-10-23
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
| Version | 0.1 |
| Release(s) covered | Production redeploy of `fa13f95` with analytics on (dpl_Co5YsP3eWZdz3pu6xYaByX5fBA9y, 2026-10-26) |
| Review period | 2026-10-26 – 2026-11-25 |
| Review type | T+30 |
| Status | pending (live since 2026-10-26; review due 2026-11-25) |
| Owner | Owner (bookchaowalit) |
| AI maker | Claude Code (session w4c-loop-pilot) prepared the empty review |
| AI reviewer | Fresh read-only Claude reviewer at review time |
| KPI plan version | [KPI-PLAN.md](KPI-PLAN.md) v0.2 |
| Data snapshot | PostHog insight exports from `analytics/posthog/dashboard.json` and layer-1 SQL rows from `analytics/kpi/` — aggregates only |
| Previous review | none (first review) |
| Phase gate record | G11 record — fill in at review |
| Due | 2026-11-25 (go-live 2026-10-26 + 30 days) |

## Summary

| Objective | Outcome KPI | Verdict | One-line reason |
|---|---|---|---|
| OBJ-01 | KPI-O-01 (north star) | pending | Live since 2026-10-26; first events reached PostHog, baseline still collecting |

Overall decision: **pending** — live since 2026-10-26; the review runs at T+30 (2026-11-25).

## KPI results

| KPI ID | Type | Baseline | Target (by date) | Previous review | This period | Change vs baseline | Status | Data quality note |
|---|---|---|---|---|---|---|---|---|
| KPI-O-01 | outcome (north star) | not yet measured | ≥ 40%, go-live + 90 days (provisional) | — | — | — | pending go-live | Layer-1 limits listed in KPI-PLAN.md |
| KPI-L-01 | leading | not yet measured | ≥ 50%, go-live + 90 days (provisional) | — | — | — | pending go-live | |
| KPI-L-02 | leading | not yet measured | ≥ 3 / user / week, go-live + 90 days (provisional) | — | — | — | pending go-live | |
| KPI-L-03 | leading | not yet measured | ≥ 20%, go-live + 90 days (provisional) | — | — | — | pending go-live | Can exceed 100% (re-completions) |
| KPI-L-04 | leading | not yet measured | ≥ 30%, go-live + 90 days (provisional) | — | — | — | pending go-live | Consented visitors only |
| KPI-G-01 | guardrail | not yet measured | ≤ 2% | — | — | — | pending go-live | |

Below the minimum volume in the KPI plan, write `not measurable`, not a
percentage.

## Attribution

| KPI ID | Evidence type | Confidence | Other possible causes checked |
|---|---|---|---|
| all | before-after only (first period is the baseline) | low | — |

## Qualitative signals

| Source | Volume this period | Top themes | Link |
|---|---|---|---|
| GitHub issues (autopilot backlog) | — | — | — |
| Sentry errors (`personal-yu0`) | — | — | — |

## Decisions and actions

Filled in at the review. Allowed types: backlog item, experiment, discovery
question, KPI definition change, retire feature, change request, roadmap
change. One action per row; write the task key or issue into "Tracked in".

| # | Decision | Type | Owner | Due | Tracked in |
|---|---|---|---|---|---|
| 1 | [Filled at the T+30 review] | [type] | Owner | [YYYY-MM-DD] | [outcome-review/OR-101#1] |

Continuous discovery: open questions from this review go here.

- [Question] → [Destination]

## Approval and sign-off

| Decision | Approver | Date | Evidence |
|---|---|---|---|
| accept review and decisions | Owner | — | — |
| next review scheduled (OR-102, T+60) | Owner | — | task `outcome-review/trackit/<date>` |
