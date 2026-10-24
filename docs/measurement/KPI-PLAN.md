---
title: TrackIt — KPI and Instrumentation Plan
status: approved
tags: [measurement, kpi, analytics, pilot, adr-0005]
created: 2026-10-21
updated: 2026-10-23
description: KPI tree, metric definitions, event specification, and instrumentation checks for TrackIt (productivity-tracking-web), the pilot of ADR-0005.
source_template: architecture-docs templates/sdlc/kpi-and-instrumentation-plan.md
---

# TrackIt — KPI and Instrumentation Plan

Pilot of ADR-0005 (product analytics standard, accepted 2026-10-21). TrackIt is
a tier B showcase with no claimed production users (`TRUTH-PASS.md`), so the
pilot's first goal is to prove the measurement chain end to end, not to report
growth. Every baseline starts as `not yet measured`.

Big Loop W4 (2026-10-23): this plan is one of the three pilots that must close
one full loop (events live → baseline → outcome review → backlog item →
shipped → measured again) before M2 (2026-12-31). All events, server and
browser, stay **off** until the owner sets the three variables in
[GO-LIVE.md](GO-LIVE.md). Event catalog: [EVENTS.md](EVENTS.md). Learn stage:
[OUTCOME-REVIEW-001.md](OUTCOME-REVIEW-001.md) (OR-101) and
[EXPERIMENT-LOG.md](EXPERIMENT-LOG.md).

## North star and input metrics

| Role | KPI | Why it is tied to the user goal ("find an item, see its state, update the next action") |
|---|---|---|
| **North star** | KPI-O-01 Weekly active trackers | A user who keeps updating entries week after week is getting the core value |
| Input 1 | KPI-L-01 Activation within 24 hours | No first entry, no tracker: the first step of the value |
| Input 2 | KPI-L-02 Updates per active user per week | The "update the next action" part, measured from server events |
| Input 3 | KPI-L-03 Completion rate, 30 days | Items move to done instead of piling up |
| Input 4 | KPI-L-04 Find usage rate | The "find an item" part: search and filters are used (browser, consent only) |
| Guardrail | KPI-G-01 Tracking write server-error rate | Growth must not come with broken saves |

## Document control

| Field | Value |
|---|---|
| Project / product ID | TrackIt (`bookchaowalit-website/productivity-tracking-web`) |
| Version | 0.2 |
| Status | draft — instrumented behind a flag (off by default, W4 pilot 2026-10-23); waiting for owner approval together with SPEC-001 (D10) |
| Metric owner | Owner (bookchaowalit) |
| AI maker | Claude Code (main session) |
| AI reviewer | independent Claude reviewer subagent (`solo:solo-reviewer`, Sonnet, read-only, no maker context), 2026-10-24: approved (see Approval) |
| Charter objectives | OBJ-01 from `PRODUCT.md`: "the user can find an item, understand its current state, and update the next action without losing context" |
| Analytics / data source of truth | Layer 1: Postgres via `analytics/kpi/*.sql`. Layer 2: PostHog Cloud EU, shared own-products project, `product = "trackit"` (ADR-0005 D-2) |
| Dashboard | PostHog dashboard "TrackIt pilot" — spec in [`analytics/posthog/dashboard.json`](../../analytics/posthog/dashboard.json), created by the owner after sign-up (A-1) |
| Next review | OR-101 ([OUTCOME-REVIEW-001.md](OUTCOME-REVIEW-001.md)) — due go-live + 30 days; pending go-live |

## KPI tree

```text
OBJ-01 Keep the next action easy to update
  └─ KPI-O-01 Weekly active trackers            (layer 1)
       ├─ KPI-L-01 Activation within 24 hours   (layer 1)
       ├─ KPI-L-02 Updates per active user/week  (layer 2)
       ├─ KPI-L-03 Completion rate, 30 days      (layer 1)
       ├─ KPI-L-04 Find usage rate               (layer 2, browser, consent only)
       └─ KPI-G-01 Tracking write failure rate   (layer 2)
```

## KPI definitions

| KPI ID | Type | Name | Objective | Formula (numerator / denominator) | Unit | Min volume for a rate | Segment / filter | Data source and event(s) | Baseline (value, period, evidence) | Target (value, by date) | Alert threshold | Cadence | Owner |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| KPI-O-01 | outcome | Weekly active trackers | OBJ-01 | users with a tracking entry created or updated in the last 7 days / users signed up ≥ 7 days before | % | 20 eligible users | all users | `analytics/kpi/KPI-O-01-weekly-active-trackers.sql` (`User.createdAt`, `UserTracking.updatedAt`) | not yet measured — capture at first run | provisional ≥ 40% by go-live + 90 days (OR-103); restated after 2 baseline periods | — (no alert while below min volume) | weekly | Owner |
| KPI-L-01 | leading | Activation within 24 hours | OBJ-01 | users who signed up between 30 days and 24 hours before the period end and have an entry created within 24 h of sign-up / those users (a 29-day window; an entry later deleted is not counted) | % | 20 new users | users signed up in window | `analytics/kpi/KPI-L-01-activation-24h.sql` | not yet measured | provisional ≥ 50% by go-live + 90 days; restated after 2 baseline periods | — | weekly | Owner |
| KPI-L-02 | leading | Updates per active user per week | OBJ-01 | `tracking_updated` events in 7 days / distinct `distinct_id` with any write event (`tracking_item_added`, `tracking_updated`, `tracking_item_removed`) in 7 days. "Active" here is event-based and differs from KPI-O-01's database definition | updates/user | 20 active users | `product = trackit` | PostHog: `tracking_updated` (SPEC-001 AC-06) | not yet measured — events not live | provisional ≥ 3 by go-live + 90 days; restated after 2 baseline periods | — | weekly | Owner |
| KPI-L-03 | leading | Completion rate, 30 days | OBJ-01 | `completed` activity logs / `added_to_list` + `created_item` logs, same 30 days | % | 20 entries added | all users | `analytics/kpi/KPI-L-03-completion-rate-30d.sql` (`ActivityLog`) | not yet measured | provisional ≥ 20% by go-live + 90 days; restated after 2 baseline periods | — | monthly | Owner |
| KPI-L-04 | leading | Find usage rate | OBJ-01 | distinct persons with `collection_filtered` in 7 days / distinct persons with `$pageview` in the same 7 days (both only from visitors who allowed analytics) | % | 20 consented visitors | `product = trackit` | PostHog: `$pageview`, `collection_filtered` (browser, [EVENTS.md](EVENTS.md)) | not yet measured — events not live | provisional ≥ 30% by go-live + 90 days; restated after 2 baseline periods | — | weekly | Owner |
| KPI-G-01 | guardrail | Tracking write server-error rate | OBJ-01 | `tracking_write_failed` with `status_code` ≥ 500 / (`tracking_item_added` + `tracking_updated` + `tracking_item_removed` + all `tracking_write_failed`). `tracking_item_completed` is not counted (it always comes with a `tracking_updated`). 404/409 are user errors, reported beside it, not part of the guardrail | % | 100 writes | `product = trackit` | PostHog: SPEC-001 AC-05…AC-08 | not yet measured | must stay ≤ 2% | > 5% over 24 h with ≥ 100 writes | daily | Owner |

Known limits of the layer-1 queries: KPI-O-01 misses users whose only activity
was a delete (no `updatedAt` left); KPI-L-03 can exceed 100% because it counts
re-completions and misses items added already `COMPLETED`; KPI-L-03 still
counts log rows of deleted users (Q-4). Write these next to the number in every
outcome review.

Pilot rule: targets are provisional (owner to confirm **[ต้องยืนยัน]**) and are
restated after two baseline periods, because TrackIt has no traffic history.
"go-live" is the date of the first production event (GO-LIVE.md step 5); write
the real dates into this table on that day.
KPI-L-04 counts only visitors who allowed analytics, so it describes that
group, not all visitors. A KPI below its minimum volume is reported as
`not measurable`, never as a percentage.

## Event and data specification

Write events are sent server-side from `src/app/api/internal/tracking/route.ts`
after the database write has finished (SPEC-001). Steps that make no server
request (page views, search and filters) are sent from the browser through the
provider-neutral `src/lib/browser-analytics.ts`, only after the visitor allows
analytics in the consent banner. Every event, server or browser, is off unless
`NEXT_PUBLIC_ANALYTICS_ENABLED=true` and a key is set. Full catalog with call
sites and tests: [EVENTS.md](EVENTS.md).

| Event / field | Trigger (exact user or system action) | Properties | Personal data (incl. IDs / IP)? | Emitted by | Requirement / story | Status |
|---|---|---|---|---|---|---|
| `tracking_item_added` | POST creates a `UserTracking` row | `category`, `source` (`existing_item` / `new_item`), stored `status` | `distinct_id` = `User.id` (pseudonymous); IP not sent | backend | SPEC-001 AC-05 | implemented (tests) |
| `tracking_updated` | PUT changes at least one stored value of a `UserTracking` row | `fields_changed` (diff against the stored row: `status`, `progress`, `rating`, `isFavorite`, `priority`, dates), `status` | `User.id` | backend | AC-06 | implemented (tests) |
| `tracking_item_completed` | PUT moves status to `COMPLETED` | `category` | `User.id` | backend | AC-06 | implemented (tests) |
| `tracking_item_removed` | DELETE removes a `UserTracking` row | `category` | `User.id` | backend | AC-08 | implemented (tests) |
| `tracking_write_failed` | POST 404/409, PUT/DELETE 404, or 500 before the main write committed, with a parsed `userId` (SPEC-001 AC-07). Requests refused by the public route (401/403/413/415/validation) never reach this point | `method`, `status_code` | `User.id` | backend | AC-07 | implemented (tests) |
| `$pageview` | Route change in the browser, after consent | `$pathname` and `$current_url` with no query string, fragment or id segments | browser person id (pseudonymous); IP discarded in project settings | frontend | W4 pilot | implemented (tests), off |
| `collection_filtered` | User changes category or status, toggles favorites, or types a search (once per search, 800 ms debounce), after consent | `filter` (`search` / `category` / `status` / `favorites`) — never the search text | browser person id | frontend | W4 pilot | implemented (tests), off |
| identify | Signed-in session in the browser, after consent | `distinct_id` = `User.id`, links browser and server events | `User.id` | frontend | W4 pilot | implemented (tests), off |
| every event | — | `product = "trackit"`, `$ip = null`, `$geoip_disable = true` | — | wrapper | AC-02 | implemented (tests) |

Never sent: titles, descriptions, notes, URLs, email, name, image, request
bodies, error messages. The wrapper drops any property not on the allow-list
(SPEC-001 AC-03).

Privacy and data rules:

- `User.id` is a cuid, pseudonymous but still personal data under PDPA.
- Lawful basis / consent: server events tied to using the service are sent on
  contract / legitimate interest (ADR-0005 D-5). Browser events need consent:
  the banner (`src/components/analytics/consent-banner.tsx`) offers Decline and
  Allow analytics with equal weight; before a choice, and after Decline, the
  PostHog SDK is not loaded at all (no cookies, no storage, no request). The
  choice is stored in `localStorage` (`trackit.analytics-consent.v1`) and can
  be changed from "Analytics choices". The privacy notice must say this before
  the first production event (owner action A-3).
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
| TrackIt pilot | KPI-L-02, KPI-L-04, KPI-G-01, first-event check | Owner | PostHog (EU), spec `analytics/posthog/dashboard.json` | live | — | planned (A-1) |
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
| 7 | Tracking respects consent | `tests/browser-analytics.test.cjs` (no load, no request before consent or after Decline); server events on contract / legitimate interest (D-5) | pass in tests — recheck on production with the browser network panel at go-live |

## Owner actions

| ID | Action | Needed before |
|---|---|---|
| A-1 | Create the PostHog Cloud account in the **EU** region; confirm the free-plan limits and retention (ADR-0005 [ต้องยืนยัน]); read the DPA and sub-processor list and record the links in ADR-0005 (D-6 condition); switch on "discard client IP data"; create the "TrackIt pilot" dashboard | first production event |
| A-2 | Create a read-only Postgres role that can SELECT only the columns the `analytics/kpi` queries use; store its URL in Infisical; run the three queries once for a baseline | first outcome review |
| A-3 | Update TrackIt's privacy notice: server-side usage analytics with PostHog (EU), pseudonymous user ID, purpose, retention, how to ask for deletion | first production event |
| A-4 | Put the project key in Infisical `/posthog` (D-8) and set `NEXT_PUBLIC_ANALYTICS_ENABLED=true`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com` in the Vercel project env; deploy only after the D10 review (merge does not deploy this repo). Steps: [GO-LIVE.md](GO-LIVE.md) | first production event |
| A-5 | Privacy impact assessment for TrackIt analytics from `templates/development-cycle/privacy-impact-assessment.md` | G10 |

## Baseline collection

| KPI | How the baseline is collected | When |
|---|---|---|
| KPI-O-01, KPI-L-01, KPI-L-03 | Run the layer-1 SQL in `analytics/kpi/` with the read-only role (A-2) for the two full periods after go-live; paste the result rows into OR-101 | weekly / monthly from go-live |
| KPI-L-02, KPI-L-04, KPI-G-01 | Read the PostHog insights from `analytics/posthog/dashboard.json` for the first two full weeks after go-live; below the minimum volume write `not measurable` | weekly from go-live |

## Change history of definitions

| Date | KPI ID | Change | Reason | Baseline restated? | Approved by |
|---|---|---|---|---|---|
| 2026-10-21 | all | First definitions | Pilot start | n/a | pending |
| 2026-10-23 | KPI-L-04, targets | Added find usage rate (browser events behind consent); provisional targets; north star named | Big Loop W4 pilot | n/a (no baseline yet) | pending |

## Quality gate and approval

| Gate | Condition | Decision | Approver | Date | Evidence |
|---|---|---|---|---|---|
| G5 (06 Requirements) | Every objective has outcome, leading, and guardrail KPIs with formulas | pending | Owner — "no external signatory" (own product) | | R1 review |
| G10 (11 Deployment) | Checks 1–5 and 7 pass; check 6 passes or is waived with a dated action; SPEC-001 Q-4 (data-subject deletion) resolved; PIA (A-5) done | pending | Owner | | |
| G11 (12 Operations) | Dashboard live, first outcome review scheduled | pending | Owner | | |

## Approval (2026-10-24)

| Field | Value |
|---|---|
| Checker | independent Claude reviewer subagent (`solo:solo-reviewer`, Sonnet, read-only, no maker context) |
| Approver | AI approval under the owner's process (approvals by the owner or AI with evidence; maker and checker are different agents). Recorded by Claude session oa-remainder on the owner's instruction "ทำที่เหลือให้หน่อย" (2026-10-24) |
| Verdict | **approved** |
| Evidence | tracking_* events in src/lib/analytics.ts and api/internal/tracking/route.ts; collection_filtered in browser-analytics.ts; consent key; analytics/kpi/*.sql, dashboard.json, R1.md and tests exist; events marked off. |
