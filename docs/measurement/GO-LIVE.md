---
title: TrackIt — Analytics go-live checklist (owner)
status: draft
created: 2026-10-23
updated: 2026-10-23
description: The owner's steps to turn on TrackIt analytics. Until step 3 is done every event is off and no request goes to PostHog.
---

# TrackIt — Analytics go-live checklist (owner)

Everything is built and tested with analytics **off**. Nothing reaches PostHog
until step 3 is done and a deploy carries it. Deploying `main` is held by
Big Loop D10 (owner review of the 29 commits), so step 4 waits for that review.

| # | Step | Detail | Done |
|---|---|---|---|
| 1 | Sign up for PostHog Cloud **EU** (free plan) | One shared project for own products (ADR-0005 D-2); confirm free limits and 1-year retention on the pricing page; turn on "Discard client IP data" in project settings | ☐ |
| 2 | Accept the DPA | Read the DPA and sub-processor list; record the links in ADR-0005 (D-6 condition) and in KPI-PLAN.md "Privacy and data rules"; update the privacy notice (A-3) | ☐ |
| 3 | Set 3 env vars in the Vercel project (Production) and Infisical `/posthog` | `NEXT_PUBLIC_ANALYTICS_ENABLED=true` · `NEXT_PUBLIC_POSTHOG_KEY=<project API key, phc_…>` · `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`. The server events use the same key (no separate `POSTHOG_PROJECT_KEY` needed) | ☑ 2026-10-26 |
| 4 | Deploy | After the D10 review of `main`. Not a CLI prod deploy unless the owner names an exception (D9) | ☑ 2026-10-26 (Vercel redeploy API) |
| 5 | Check the first event | Open the site in a private window: the banner shows; before a choice the network panel has **no** request to `posthog.com`. Click "Allow analytics", change a filter, sign in and save an item. In PostHog run the "First-event check" insight: `$pageview`, `collection_filtered`, `tracking_item_added` appear with `product = trackit`, URLs have no query string. Write today's date as **go-live** in KPI-PLAN.md and OUTCOME-REVIEW-001.md | ◐ 2026-10-26: banner, no request before a choice, POST 200 after Allow; PostHog insight check left to the owner |
| 6 | Create the dashboard | Dashboard "TrackIt pilot": one SQL insight per entry in `analytics/posthog/dashboard.json` | ☐ |
| 7 | Collect the baseline | Two full weeks after go-live: PostHog insights for KPI-L-02, KPI-L-04, KPI-G-01; layer-1 SQL (`analytics/kpi/`, read-only role A-2) for KPI-O-01, KPI-L-01, KPI-L-03. Paste aggregates into OR-101 | ☐ |
| 8 | First outcome review | **OR-101 due = go-live + 30 days.** Run it, set status `decided`; empire-backlog-sync then files one task per decision row (`outcome-review/OR-101#<row>`) | ☐ |

Turning it off again: set `NEXT_PUBLIC_ANALYTICS_ENABLED=false` (or remove the
key) and redeploy. Visitors can withdraw consent from "Analytics choices".
