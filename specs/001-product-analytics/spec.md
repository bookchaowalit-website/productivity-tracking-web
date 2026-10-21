# SPEC-001 — Server-side product analytics (ADR-0005 pilot)

Standard: [ADR-0004 — TDD + SDD](https://github.com/bookchaowalit/architecture-docs/blob/main/docs/architecture/decisions/ADR-0004-tdd-sdd-standard.md).
Analytics standard: [ADR-0005](https://github.com/bookchaowalit/architecture-docs/blob/main/docs/architecture/decisions/ADR-0005-product-analytics-standard.md).
Metric definitions: [`docs/measurement/kpi-and-instrumentation-plan.md`](../../docs/measurement/kpi-and-instrumentation-plan.md).

## Document control

| Field | Value |
|---|---|
| Spec ID / version | SPEC-001 / 0.3 |
| Status | **implemented** (DoR approved by the owner 2026-10-21; DoD reviewer pass 2026-10-21) |
| Repository / path | bookchaowalit-website/productivity-tracking-web / `specs/001-product-analytics/spec.md` |
| Owner (maker) | Claude Code |
| Reviewer (checker) | Fresh read-only Claude reviewer session — [`reviews/R1.md`](./reviews/R1.md) |
| Approver | Owner (bookchaowalit); own product, no external signatory |
| Requirement links | KPI plan KPI-L-02, KPI-G-01; instrumentation checks 1–5; ADR-0005 D-1…D-8 |
| Related docs | `PRODUCT.md`, `analytics/README.md`, `.autopilot/README.md` |
| Main-only | no — branch, local merge, push (repository rule) |
| Created / approved | 2026-10-21 / 2026-10-21 |

## 1. Problem and intent

- **Problem:** TrackIt can count stored rows (layer 1), but nothing records how
  often people update the next action or how often writes fail, so KPI-L-02
  and KPI-G-01 cannot be measured and ADR-0005 has no proof in a real app.
- **Outcome:** after every tracking write, the internal route sends one
  allow-listed, pseudonymous event to PostHog Cloud EU; with no PostHog key
  configured the app behaves exactly as today; analytics can never change an
  API response.
- **Why now:** owner approved ADR-0005 G6 on 2026-10-21 and chose this repo
  as the pilot (D-4).

## 2. Scope

| In scope | Out of scope (non-goals) |
|---|---|
| `src/lib/analytics.ts`: `track(event, userId, props)` wrapper over the PostHog capture HTTP API (no SDK dependency) | Browser SDK, autocapture, session replay, consent banner (no client-side tracking in this pilot) |
| Events from `src/app/api/internal/tracking/route.ts` POST, PUT, DELETE | Events from sign-in / sign-up (NextAuth callbacks) — later spec |
| Env vars `POSTHOG_PROJECT_KEY`, `POSTHOG_HOST` (default `https://eu.i.posthog.com`) in `.env.example` | Creating the PostHog account, keys in Infisical/Vercel (owner actions A-1, A-4) |
| Integration tests in the existing `node --test` harness | Dashboards, alerts, feature flags, experiments (after events are live) |
| | Changing or removing the existing Vercel Analytics / Speed Insights (Q-3) |

## 3. Behaviour — scenarios

### AC-01 — No key, no network

- **Requirement:** ADR-0005 availability rule
- **Given** `POSTHOG_PROJECT_KEY` is unset or empty
- **When** a tracking write succeeds
- **Then** the API response is identical to today's
- **And** no outbound analytics request is made
- **Test:** `tests/analytics.test.cjs > "no key: no request"` · level: unit

### AC-02 — Event shape

- **Requirement:** KPI plan event specification; ADR-0005 layer 2 rules
- **Given** a project key is set
- **When** `track('tracking_item_added', 'user-a', { category: 'ANIME', source: 'new_item', status: 'WATCHING' })` runs
- **Then** one `POST {POSTHOG_HOST}/i/v0/e/` is sent with a JSON body whose top-level fields are `api_key`, `event`, `distinct_id: 'user-a'`, `timestamp` (ISO 8601) and `properties`
- **And** `properties` contains `product: 'trackit'`, `$ip: null`, `$geoip_disable: true` and the given properties
- **Test:** `tests/analytics.test.cjs > "sends allow-listed event"` · level: unit

### AC-03 — Allow-list drops everything else

- **Requirement:** KPI plan "never sent" list
- **Given** a key is set
- **When** `track` is called with extra properties such as `title`, `email`, `notes`, `url`, `error`, or an event name not in the spec
- **Then** properties not on the per-event allow-list are dropped, and an unknown event name sends nothing
- **Test:** `tests/analytics.test.cjs > "drops unknown properties and events"` · level: unit

### AC-04 — Analytics failure never changes the API result

- **Requirement:** ADR-0005 "analytics outage must never break the app"
- **Given** a key is set and the analytics request rejects, returns 5xx, or takes longer than the timeout (`POSTHOG_TIMEOUT_MS`, default 2000, enforced with `AbortController` + `setTimeout` so tests can drive it with `mock.timers`)
- **When** a tracking write runs
- **Then** the API returns the same status and body as with analytics off, within the 2-second timeout plus normal latency
- **And** the failure is logged once with `console.warn` without the payload
- **Note:** PostHog answers 200 even for events it later drops, so a 200 is not proof of ingestion; check 1 of the KPI plan verifies arrival in PostHog.
- **Test:** `tests/analytics.test.cjs > "failure is swallowed"` and `tests/tracking-analytics.test.cjs > "write succeeds when analytics fails"` · level: unit + integration

### AC-05 — Add emits `tracking_item_added`

- **Requirement:** KPI-G-01 denominator, check 2 reconciliation
- **Given** user-a is signed in
- **When** POST adds an item (existing or new catalogue item)
- **Then** exactly one `tracking_item_added` is sent with `category`, the **stored** `status` (default `PLAN_TO_WATCH` when the request omits it), and `source` = `existing_item` or `new_item`
- **Test:** `tests/tracking-analytics.test.cjs > "add emits tracking_item_added"` · level: integration

### AC-06 — Update emits `tracking_updated`, completion also `tracking_item_completed`

- **Requirement:** KPI-L-02
- **Given** user-a has item-a with status `WATCHING`
- **When** PUT changes `progress` and sets status `COMPLETED`
- **Then** one `tracking_updated` is sent with `fields_changed` = the fields whose stored value differs between `currentTracking` and the updated row (`status`, `progress`, `rating`, `isFavorite`, `priority`, `startDate`, `finishDate`) and the resulting `status`
- **And** a PUT that changes nothing (200, empty diff) sends no `tracking_updated`
- **And** one `tracking_item_completed` with `category` is sent, only when the status changes into `COMPLETED`
- **Test:** `tests/tracking-analytics.test.cjs > "update emits tracking_updated and completed"` · level: integration

### AC-07 — Failed write emits `tracking_write_failed`

- **Requirement:** KPI-G-01 numerator
- **Given** the internal secret check passed and a non-empty `userId` was parsed from the request
- **When** the write ends with one of the reachable failures: POST 404 (unknown user), POST 409 (already on the list), PUT/DELETE 404 (not owned or missing), or 500 before the main write committed
- **Then** one `tracking_write_failed` with `method` and `status_code` only is sent
- **And** nothing is sent when the secret check fails (401), when `userId` is missing (400), or when the body is not valid JSON (500 with no `userId`)
- **And** when the main write committed and a later step (the `activityLog` insert) throws, the success event has already been sent and no `tracking_write_failed` is sent, so a committed write is never counted as failed
- **Note:** the public route rejects 401, 403, 413/415 and validation errors before forwarding, so those never reach the internal route and are outside KPI-G-01
- **Test:** `tests/tracking-analytics.test.cjs > "failed writes emit tracking_write_failed"` and `> "log failure after commit sends no failed event"` · level: integration

### AC-08 — Delete emits `tracking_item_removed`

- **Requirement:** KPI plan event specification
- **Given** user-a has item-a
- **When** DELETE removes it
- **Then** one `tracking_item_removed` with `category` is sent
- **Test:** `tests/tracking-analytics.test.cjs > "delete emits tracking_item_removed"` · level: integration

### AC-09 — Ownership boundary

- **Requirement:** existing ownership rule (`findOwnedTracking`)
- **Given** user-a tries to change user-b's item
- **When** PUT or DELETE is refused with 404
- **Then** the event's `distinct_id` is user-a and no property of user-b's item is sent
- **Test:** `tests/tracking-analytics.test.cjs > "refused write leaks nothing"` · level: integration

## 4. Interfaces and data

| Interface | Change | Contract |
|---|---|---|
| `src/lib/analytics.ts` `track(event, userId, props): Promise<void>` | new | Never throws; resolves after send, failure, or 2 s timeout |
| Internal route POST / PUT / DELETE | changed (side effect only) | Responses unchanged. Success event right after the main write (`userTracking.create`, `trackingItem.create`, `update` or `delete`) and before the `activityLog` insert; `tracking_write_failed` only on the early 404 returns, P2002 → 409, or in `catch` when a `committed` flag declared outside `try` is still false |
| PostHog capture API | new outbound call | `POST {host}/i/v0/e/`, JSON body, `Content-Type: application/json` |
| Env `POSTHOG_PROJECT_KEY`, `POSTHOG_HOST` | new | Optional; absent = analytics off |

- **Data model / migration:** N/A — no schema change.
- **Backward compatibility:** the public route and its callers see no change.

## 5. Non-functional requirements

| NFR | Target | How it is tested |
|---|---|---|
| Performance | Added latency ≤ 2 s worst case (timeout), normally one HTTPS round trip to EU | AC-04 timeout test with a fake slow endpoint |
| Security / privacy | Only allow-listed properties; `$ip: null`; key only from env; nothing before the internal secret check | AC-02, AC-03, AC-07, AC-09 |
| Reliability / observability | Awaited with a timeout, never throws; one `console.warn` per failure, no payload in logs | AC-04 |
| Accessibility / UX | N/A — no UI change | — |

## 6. Test plan (TDD)

- **Test levels:** unit for the wrapper; integration through the in-memory Prisma fixture pattern of `tests/tracking-writes.test.cjs`.
- **Harness changes:** `loadRoute` cannot resolve the `@/lib/analytics` alias, and the existing fake `fetch` sends every request to the internal route. So: (a) unit tests load `src/lib/analytics.ts` through `loadRoute` and stub `global.fetch` with a recorder; (b) integration tests (`tests/tracking-analytics.test.cjs`) stub `'@/lib/analytics'` with a recorder module, and any fake `fetch` dispatches by URL host; (c) the timeout is read from `POSTHOG_TIMEOUT_MS` and driven with `mock.timers`, never a real 2 s wait.
- **Test data:** fixture users `user-a`, `user-b`; no real keys (tests set a dummy key and stub `fetch`).
- **Coverage:** the repo's CI runs `npm test`; this change adds tests and must not remove any.
- **Not test-first (exceptions):** `.env.example` and docs (pure configuration and documentation).

### Red / green log

| Scenario | Test | Red: commit / run + failure message | Green: commit / run | Refactor note |
|---|---|---|---|---|
| AC-01 | `analytics.test.cjs` "no key: no request" | 2c561e6 · `node --test tests/analytics.test.cjs tests/tracking-analytics.test.cjs` · `ENOENT: src/lib/analytics.ts` (module missing) | 84aa79b · `npm test` 94/94 | none |
| AC-02 | "sends allow-listed event", "POSTHOG_HOST overrides…", "caller cannot override…" | 2c561e6 · `node --test tests/analytics.test.cjs tests/tracking-analytics.test.cjs` · `ENOENT` (module missing) | 84aa79b · `npm test` 94/94 | none |
| AC-03 | "drops unknown properties and events" | 2c561e6 · `node --test tests/analytics.test.cjs tests/tracking-analytics.test.cjs` · `ENOENT` (module missing) | 84aa79b · `npm test` 94/94 | none |
| AC-04 | "failure is swallowed" ×3; `tracking-analytics` "write succeeds when analytics fails" | 2c561e6 · `node --test tests/analytics.test.cjs tests/tracking-analytics.test.cjs` · `ENOENT` (module missing) | 84aa79b · `npm test` 94/94 | none |
| AC-05 | "add emits tracking_item_added" | 2c561e6 · `node --test tests/analytics.test.cjs tests/tracking-analytics.test.cjs` · `deepEqual`: expected 2 events, got `[]` | 84aa79b · `npm test` 94/94 | none |
| AC-06 | "update emits tracking_updated and completed"; "update with no stored change sends nothing" | 2c561e6 · `node --test tests/analytics.test.cjs tests/tracking-analytics.test.cjs` · first: got `[]`; second passed before the code (negative case — expected, it asserts no event) | 84aa79b · `npm test` 94/94 | none |
| AC-07 | "failed writes emit…"; "log failure after commit…"; "failures without a userId or secret send nothing" | 2c561e6 · `node --test tests/analytics.test.cjs tests/tracking-analytics.test.cjs` · first two: got `[]` / missing success event; third passed before the code (negative case) | 84aa79b · `npm test` 94/94 | none |
| AC-08 | "delete emits tracking_item_removed" | 2c561e6 · `node --test tests/analytics.test.cjs tests/tracking-analytics.test.cjs` · got `[]` | 84aa79b · `npm test` 94/94 | none |
| AC-09 | "refused write leaks nothing" | 2c561e6 · `node --test tests/analytics.test.cjs tests/tracking-analytics.test.cjs` · got `[]` | 84aa79b · `npm test` 94/94 | none |
| AC-04 (DoD P2) | "a completing PUT waits for one timeout, not two" | 92650c2 · `node --test tests/tracking-analytics.test.cjs` · `deepEqual` actual `['tracking_updated']`, expected both events in flight | bc303a4 · `npm test` 98/98 (full suite) | events sent with `Promise.all` |
| AC-04 (DoD P3) | "analytics failure logs one warning without the reason text" | 92650c2 · same command · warning contained `user:pass@ingest.test` | bc303a4 · `npm test` 98/98 | fixed reason `request failed` |
| AC-06 / AC-07 (DoD P3) | "date changes are listed…"; "pre-commit 500 on POST and DELETE…" | 92650c2 · passed before the fix: added coverage for behaviour already implemented in 84aa79b | bc303a4 · `npm test` 98/98 | none |

## 7. Risks and open questions

| # | Risk or question | Impact | Owner | Resolution / date |
|---|---|---|---|---|
| Q-1 | PostHog free-plan limits and EU hosting confirmed at sign-up | ADR-0005 assumption | Owner | A-1 |
| Q-2 | Privacy notice must describe server-side analytics before the first production event | PDPA transparency | Owner | A-3 |
| Q-3 | The app already loads Vercel Web Analytics and Speed Insights. ADR-0005 layer 3 names Cloudflare Web Analytics or Umami | Consistency with D-7 | Owner | **Decided 2026-10-21 by the owner: keep Vercel Web Analytics as TrackIt's page layer** (D-7 exception, recorded in ADR-0005) |
| Q-4 | There is no user-delete path in `src`, and `ActivityLog` has no foreign key to `User` and stores `itemTitle` (free text). A data-subject request cannot be completed today | Data-subject deletion (PDPA) | Owner | **blocks G10** of the pilot: needs a deletion spec (SPEC-002) or a documented manual procedure before production events start |
| Q-6 | When the main write commits and the `activityLog` insert then fails, the API returns 500 for a write that happened (existing behaviour) | KPI-G-01 accuracy | Owner | handled in AC-07: success event already sent, no failure event; the 500 itself is unchanged |
| Q-5 | Merge does not deploy this repo; events start only after a manual Vercel deploy with the key set | Pilot timeline | Owner | A-4 |

## 8. Change log

| Version | Date | Change | Scenarios affected | Approved by |
|---|---|---|---|---|
| 0.1 | 2026-10-21 | First draft | all | — |
| 0.2 | 2026-10-21 | R1: AC-07 reachable failures and committed-write rule; harness plan; injectable timeout; top-level `timestamp`; stored `status`; `fields_changed` as a real diff; Q-4 blocks G10; Q-6 | AC-02, 04, 05, 06, 07 | — |
| 0.3 | 2026-10-21 | R2: §4 event timing matches the committed-write rule; NFR wording; named test for log failure after commit | AC-07 | — |
| 0.4 | 2026-10-21 | Implemented; DoD review fixes (parallel completion events, fixed warning reason, extra tests) | AC-04, AC-06, AC-07 | — |

## Approval

| Gate | Role | Name / date | Decision | Evidence |
|---|---|---|---|---|
| Spec ready (before code, DoR) | Reviewer (checker) | Fresh Claude reviewer / 2026-10-21 | R1 revise (3 P1) → fixed in 0.2; R2 **pass** with one P2 (§4 wording) fixed in 0.3 | [`reviews/R1.md`](./reviews/R1.md) |
| Spec ready (before code, DoR) | Approver | Owner / 2026-10-21 | **approve** | "อนุมัติ SPEC-001 v0.3 (DoR) วันนี้ เริ่มเขียนโค้ดแบบ test-first ได้เลย และเรื่อง Q-3 ให้เก็บ Vercel Analytics ไว้เป็น page layer" |
| Implemented (DoD) | Reviewer (checker) | Fresh Claude reviewer / 2026-10-21 | **pass** (red reproduced at 2c561e6; 0 P1, 1 P2 + 3 P3 fixed in bc303a4) | No push-triggered CI in this repo (only the autopilot cron); green evidence is the local full suite, `npm test` 98/98 on merged `main` 5c39de1, plus `tsc` and `next build` |
