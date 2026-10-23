---
title: TrackIt — Event catalog
status: draft
created: 2026-10-23
updated: 2026-10-23
description: Every analytics event TrackIt can send, the metric it feeds, where it fires and which test covers it. All events are off until NEXT_PUBLIC_ANALYTICS_ENABLED=true and a PostHog key are set; browser events also wait for consent.
---

# TrackIt — Event catalog

Metric definitions: [KPI-PLAN.md](KPI-PLAN.md). Go-live steps: [GO-LIVE.md](GO-LIVE.md).
`tests/event-catalog.test.cjs` fails when an event below has no call site or no
test, or when the code can send an event that is not listed here.

Every event carries `product = "trackit"`. Server events also set `$ip = null`
and `$geoip_disable = true`; browser events go through `before_send`
(`src/lib/posthog-adapter.ts`), which removes query strings, fragments, id
segments, referrer paths and `$ip`.

## Events

| Event | Emitted by | Properties (allow-list) | Feeds metric | Call site | Test |
|---|---|---|---|---|---|
| `tracking_item_added` | server | `category`, `source`, `status` | KPI-L-02 (active users), KPI-G-01 (writes) | `src/app/api/internal/tracking/route.ts` `POST` | `tests/tracking-analytics.test.cjs`, `tests/analytics.test.cjs` |
| `tracking_updated` | server | `fields_changed`, `status` | KPI-L-02, KPI-G-01 | `src/app/api/internal/tracking/route.ts` `PUT` | `tests/tracking-analytics.test.cjs` |
| `tracking_item_completed` | server | `category` | KPI-L-03 cross-check (layer 1 is the source) | `src/app/api/internal/tracking/route.ts` `PUT` | `tests/tracking-analytics.test.cjs` |
| `tracking_item_removed` | server | `category` | KPI-L-02 (active users), KPI-G-01 (writes) | `src/app/api/internal/tracking/route.ts` `DELETE` | `tests/tracking-analytics.test.cjs`, `tests/analytics.test.cjs` |
| `tracking_write_failed` | server | `method`, `status_code` | KPI-G-01 | `src/app/api/internal/tracking/route.ts` `trackFailure` | `tests/tracking-analytics.test.cjs` |
| `$pageview` | browser, after consent | `$pathname`, `$current_url` (cleaned) | KPI-L-04 (denominator) | `src/components/analytics/analytics-provider.tsx` (`analytics.page` on route change) | `tests/browser-analytics.test.cjs`, `tests/posthog-adapter.test.cjs` |
| `collection_filtered` | browser, after consent | `filter` ∈ `search`, `category`, `status`, `favorites` | KPI-L-04 (numerator) | `src/app/page.tsx` (search effect, category tabs, status buttons, favorites toggle) | `tests/browser-analytics.test.cjs` |

## Identity

| Call | When | Value | Test |
|---|---|---|---|
| `identify` | signed-in session, after consent | `User.id` (cuid, pseudonymous); emails or free text are refused | `tests/browser-analytics.test.cjs` |
| `forgetIdentity` → `reset` | signed out (also on a later page load), after consent, only if a user was identified on this browser | — | `tests/browser-analytics.test.cjs`, `tests/posthog-adapter.test.cjs` |

## Never sent

Titles, descriptions, notes, search text, URLs with queries, email, name,
image, request bodies, error messages. There is no autocapture (forms and
inputs are never read), no session recording, no heatmaps and no surveys.
