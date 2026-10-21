---
title: TrackIt — KPI and Instrumentation Plan
status: draft
tags: [measurement, kpi, analytics, pilot, adr-0005]
created: 2026-10-21
updated: 2026-10-21
description: KPI tree, metric definitions, event specification, and instrumentation checks for TrackIt (productivity-tracking-web), the pilot of ADR-0005.
source_template: architecture-docs templates/sdlc/kpi-and-instrumentation-plan.md
---

# TrackIt — KPI and Instrumentation Plan

Pilot of ADR-0005 (product analytics standard, accepted 2026-10-21). TrackIt is
a tier B showcase with no claimed production users (`TRUTH-PASS.md`), so the
pilot's first goal is to prove the measurement chain end to end, not to report
growth. Every baseline starts as `not yet measured`.

## Document control

| Field | Value |
|---|---|
| Project / product ID | TrackIt (`bookchaowalit-website/productivity-tracking-web`) |
| Version | 0.1 |
| Status | draft — waiting for owner approval together with SPEC-001 |
| Metric owner | Owner (bookchaowalit) |
| AI maker | Claude Code (main session) |
| AI reviewer | Fresh read-only Claude reviewer — review notes in `specs/001-product-analytics/reviews/R1.md` |
| Charter objectives | OBJ-01 from `PRODUCT.md`: "the user can find an item, understand its current state, and update the next action without losing context" |
| Analytics / data source of truth | Layer 1: Postgres via `analytics/kpi/*.sql`. Layer 2: PostHog Cloud EU, shared own-products project, `product = "trackit"` (ADR-0005 D-2) |
| Dashboard | PostHog dashboard "TrackIt pilot" — not created yet (owner action A-1) |
| Next review | First outcome review 30 days after layer-2 events go live |

## KPI tree

```text
OBJ-01 Keep the next action easy to update
  └─ KPI-O-01 Weekly active trackers            (layer 1)
       ├─ KPI-L-01 Activation within 24 hours   (layer 1)
       ├─ KPI-L-02 Updates per active user/week  (layer 2)
       ├─ KPI-L-03 Completion rate, 30 days      (layer 1)
       └─ KPI-G-01 Tracking write failure rate   (layer 2)
```

## KPI definitions

| KPI ID | Type | Name | Objective | Formula (numerator / denominator) | Unit | Min volume for a rate | Segment / filter | Data source and event(s) | Baseline (value, period, evidence) | Target (value, by date) | Alert threshold | Cadence | Owner |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| KPI-O-01 | outcome | Weekly active trackers | OBJ-01 | users with a tracking entry created or updated in the last 7 days / users signed up ≥ 7 days before | % | 20 eligible users | all users | `analytics/kpi/KPI-O-01-weekly-active-trackers.sql` (`User.createdAt`, `UserTracking.updatedAt`) | not yet measured — capture at first run | set after 2 baseline periods (pilot rule) | — (no alert while below min volume) | weekly | Owner |
| KPI-L-01 | leading | Activation within 24 hours | OBJ-01 | users who signed up between 30 days and 24 hours before the period end and have an entry created within 24 h of sign-up / those users (a 29-day window; an entry later deleted is not counted) | % | 20 new users | users signed up in window | `analytics/kpi/KPI-L-01-activation-24h.sql` | not yet measured | set after 2 baseline periods | — | weekly | Owner |
| KPI-L-02 | leading | Updates per active user per week | OBJ-01 | `tracking_updated` events in 7 days / distinct `distinct_id` with any write event (`tracking_item_added`, `tracking_updated`, `tracking_item_removed`) in 7 days. "Active" here is event-based and differs from KPI-O-01's database definition | updates/user | 20 active users | `product = trackit` | PostHog: `tracking_updated` (SPEC-001 AC-06) | not yet measured — events not live | set after 2 baseline periods | — | weekly | Owner |
| KPI-L-03 | leading | Completion rate, 30 days | OBJ-01 | `completed` activity logs / `added_to_list` + `created_item` logs, same 30 days | % | 20 entries added | all users | `analytics/kpi/KPI-L-03-completion-rate-30d.sql` (`ActivityLog`) | not yet measured | set after 2 baseline periods | — | monthly | Owner |
| KPI-G-01 | guardrail | Tracking write server-error rate | OBJ-01 | `tracking_write_failed` with `status_code` ≥ 500 / (`tracking_item_added` + `tracking_updated` + `tracking_item_removed` + all `tracking_write_failed`). `tracking_item_completed` is not counted (it always comes with a `tracking_updated`). 404/409 are user errors, reported beside it, not part of the guardrail | % | 100 writes | `product = trackit` | PostHog: SPEC-001 AC-05…AC-08 | not yet measured | must stay ≤ 2% | > 5% over 24 h with ≥ 100 writes | daily | Owner |

Known limits of the layer-1 queries: KPI-O-01 misses users whose only activity
was a delete (no `updatedAt` left); KPI-L-03 can exceed 100% because it counts
re-completions and misses items added already `COMPLETED`; KPI-L-03 still
counts log rows of deleted users (Q-4). Write these next to the number in every
outcome review.

Pilot rule: targets are left open until two baseline periods exist, because
TrackIt has no traffic history. A KPI below its minimum volume is reported as
`not measurable`, never as a percentage.

## Event and data specification

All layer-2 events are sent server-side from `src/app/api/internal/tracking/route.ts`
after the database write has finished (SPEC-001). No browser SDK in this pilot.

| Event / field | Trigger (exact user or system action) | Properties | Personal data (incl. IDs / IP)? | Emitted by | Requirement / story | Status |
|---|---|---|---|---|---|---|
| `tracking_item_added` | POST creates a `UserTracking` row | `category`, `source` (`existing_item` / `new_item`), stored `status` | `distinct_id` = `User.id` (pseudonymous); IP not sent | backend | SPEC-001 AC-05 | planned |
| `tracking_updated` | PUT changes at least one stored value of a `UserTracking` row | `fields_changed` (diff against the stored row: `status`, `progress`, `rating`, `isFavorite`, `priority`, dates), `status` | `User.id` | backend | AC-06 | planned |
| `tracking_item_completed` | PUT moves status to `COMPLETED` | `category` | `User.id` | backend | AC-06 | planned |
| `tracking_item_removed` | DELETE removes a `UserTracking` row | `category` | `User.id` | backend | AC-08 | planned |
| `tracking_write_failed` | POST 404/409, PUT/DELETE 404, or 500 before the main write committed, with a parsed `userId` (SPEC-001 AC-07). Requests refused by the public route (401/403/413/415/validation) never reach this point | `method`, `status_code` | `User.id` | backend | AC-07 | planned |
| every event | — | `product = "trackit"`, `$ip = null`, `$geoip_disable = true` | — | wrapper | AC-02 | planned |

Never sent: titles, descriptions, notes, URLs, email, name, image, request
bodies, error messages. The wrapper drops any property not on the allow-list
(SPEC-001 AC-03).

Privacy and data rules:

- `User.id` is a cuid, pseudonymous but still personal data under PDPA.
- Lawful basis / consent: server events tied to using the service are sent on
  contract / legitimate interest (ADR-0005 D-5); no browser tracking, so no
  consent banner in this pilot. The privacy notice must say this before the
  first production event (owner action A-3).
- Retention: PostHog free plan, reported 1 year **[ต้องยืนยัน at sign-up]**;
  layer-1 queries keep nothing.
- Analytics vendor as data processor: PostHog, DPA and sub-processor list read
  at sign-up (ADR-0005 D-6 condition, owner action A-1).
- Cross-border transfer (PDPA section 28 adequacy not available for the EU, so a section 29 safeguard): PostHog EU plus vendor and
  sub-processor locations; safeguard = vendor DPA/SCC **[ต้องยืนยัน]**.
- Deletion on a data-subject request: delete the person in PostHog **with the
  delete-events option**, by `User.id`, within 30 days. The app has no
  user-delete path today, and `ActivityLog` (no foreign key, stores
  `itemTitle`) would survive one — SPEC-001 Q-4, which blocks G10.
- Privacy impact assessment for TrackIt analytics: not written yet (owner
  action A-5, from `templates/development-cycle/privacy-impact-assessment.md`).
- PostHog project setting "discard client IP data" switched on at sign-up
  (A-1), on top of `$ip: null` per event.

## Dashboards and alerts

| Dashboard / alert | KPIs shown | Audience | Location | Refresh | Alert channel | Status |
|---|---|---|---|---|---|---|
| TrackIt pilot | KPI-L-02, KPI-G-01 | Owner | PostHog (EU) | live | — | planned (A-1) |
| Write failure alert | KPI-G-01 | Owner | PostHog alert | hourly | email to owner, or Telegram `book_noti_bot` via webhook **[ต้องยืนยัน PostHog free-plan alerts]** | planned |
| Layer-1 KPI run | KPI-O-01, KPI-L-01, KPI-L-03 | Owner | result rows pasted into the outcome review | weekly / monthly | — | planned (A-2) |

## Instrumentation verification (before G10)

| # | Check | Evidence | Result |
|---|---|---|---|
| 1 | Every event fires once per real action (SPEC-001 integration tests, then one manual pass against PostHog) | test run + PostHog live-events capture | pending |
| 2 | PostHog `tracking_item_added` count (not deduplicated by PostHog — retries could double count) reconciles with `ActivityLog` `added_to_list` + `created_item` for the same day (± 2%) | query + numbers | pending |
| 3 | No personal data beyond `User.id` in payloads (sample of 20 events) | sample file | pending |
| 4 | Dashboard renders KPI-L-02 and KPI-G-01 from seeded test traffic | screenshot | pending |
| 5 | Write-failure alert fires on a forced test condition | alert message | pending |
| 6 | Baselines captured or a dated action recorded | this file | pending (waivable with a dated action) |
| 7 | Tracking respects consent | N/A for this pilot: no browser tracking; server events on contract / legitimate interest (D-5) | N/A — reason recorded |

## Owner actions

| ID | Action | Needed before |
|---|---|---|
| A-1 | Create the PostHog Cloud account in the **EU** region; confirm the free-plan limits and retention (ADR-0005 [ต้องยืนยัน]); read the DPA and sub-processor list and record the links in ADR-0005 (D-6 condition); switch on "discard client IP data"; create the "TrackIt pilot" dashboard | first production event |
| A-2 | Create a read-only Postgres role that can SELECT only the columns the `analytics/kpi` queries use; store its URL in Infisical; run the three queries once for a baseline | first outcome review |
| A-3 | Update TrackIt's privacy notice: server-side usage analytics with PostHog (EU), pseudonymous user ID, purpose, retention, how to ask for deletion | first production event |
| A-4 | Put `POSTHOG_PROJECT_KEY` in Infisical `/posthog` (D-8) and in the Vercel project env; deploy manually (merge does not deploy this repo) | first production event |
| A-5 | Privacy impact assessment for TrackIt analytics from `templates/development-cycle/privacy-impact-assessment.md` | G10 |

## Change history of definitions

| Date | KPI ID | Change | Reason | Baseline restated? | Approved by |
|---|---|---|---|---|---|
| 2026-10-21 | all | First definitions | Pilot start | n/a | pending |

## Quality gate and approval

| Gate | Condition | Decision | Approver | Date | Evidence |
|---|---|---|---|---|---|
| G5 (06 Requirements) | Every objective has outcome, leading, and guardrail KPIs with formulas | pending | Owner — "no external signatory" (own product) | | R1 review |
| G10 (11 Deployment) | Checks 1–5 pass, check 7 N/A with reason; check 6 passes or is waived with a dated action; SPEC-001 Q-4 (data-subject deletion) resolved; PIA (A-5) done | pending | Owner | | |
| G11 (12 Operations) | Dashboard live, first outcome review scheduled | pending | Owner | | |
