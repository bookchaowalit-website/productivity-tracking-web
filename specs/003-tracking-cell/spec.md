---
title: "SPEC-003 — Move tracking data and logic out of Next.js into its own cell (productivity-tracking-api)"
status: approved, implemented
tags: [spec, sdd, cells, backend, prisma, gateway, pdpa]
created: 2026-11-12
updated: 2026-11-12
description: "Proposal from the 2026-11-12 cell audit: the tracking CRUD, rating and activity-log logic and the Postgres connection leave the Next.js app for a small cell behind the gateway; the web keeps sign-in and calls the cell. Needs owner approval (personal data, one new Neon project and Railway service)."
---

# SPEC-003 — Tracking cell

Standard: [ADR-0004 — TDD + SDD](https://github.com/bookchaowalit/architecture-docs/blob/main/docs/architecture/decisions/ADR-0004-tdd-sdd-standard.md).
Source: cell audit 2026-11-12, `architecture-docs:docs/architecture/SCALE-READINESS.md`. This repository is flagged
there as `direct-db` and `logic-in-bff`.

## Document control

| Field | Value |
|---|---|
| Spec ID / version | SPEC-003 / 0.1 |
| Status | **approved by the owner 2026-11-12** ("อนุมัติ SPEC-003"; Q2 = keep NextAuth, the recommended option); implemented 2026-11-12 |
| Repository | bookchaowalit-website/productivity-tracking-web (+ new `bookchaowalit/productivity-tracking-api`) |
| Maker | Claude Code (cell audit session) |
| Approver | Owner (bookchaowalit) |
| Autopilot | Untouched. No code changes until this spec is approved; then they go through the autopilot PR gates. |

## 1. Problem and intent

- **Today:**
  - The Next.js app connects to Postgres with Prisma (`src/lib/prisma.ts`).
  - The tracking rules live in `src/app/api/internal/tracking/route.ts`, a 366-line API route: shared items, per-user tracking rows, status and rating rules, and the activity log.
  - The browser route `src/app/api/tracking/route.ts` forwards to that route with a shared secret header.
- **Why it matters:**
  - Every Vercel function instance opens its own Prisma pool, so the frontend scales the database's connection count.
  - The business rules can only be reached through this web app, so MCP, the owner CLI and other apps cannot use them.
  - Nothing goes through the gateway: no RS256 token, no origin lock, no shared rate limit.
- **Outcome:**
  - A cell `productivity-tracking-api` built with the offers/credits recipe owns tables `tracking_items`, `user_tracking`, `tracking_notes` and `activity_log` in its own Neon project.
  - It serves `/v1/items`, `/v1/tracking` and `/v1/activity` through `gateway.bookchaowalit.com`.
  - The web app keeps NextAuth sign-in (`User`, `Account`, `Session`, `VerificationToken`) until identity can sign end users in, and calls the cell with a short-lived token.

## 2. Behaviour — scenarios (to be tested first)

| AC | Given / When / Then |
|---|---|
| AC-01 | Given a signed-in user, when they add an item that already exists, then one shared item is reused and one tracking row is created for them (same as `route.ts:156-163` today). |
| AC-02 | Given another user's item id, when the user updates or deletes it, then the cell answers 404 and nothing changes (same as `findOwnedTracking` today). |
| AC-03 | Given a create, update or delete, then exactly one activity-log row is written in the same transaction; replaying the same `Idempotency-Key` returns the first result and writes nothing new. |
| AC-04 | Given a request that does not come through the gateway, then the cell answers 403 (`GATEWAY_ASSERTION_MODE=enforce` after one week in `report`). |
| AC-05 | Given `GET /v1/tracking?limit=500`, then at most 100 rows come back, with a cursor. |
| AC-06 | Given a user's PDPA export or erase request, then all of their tracking rows, notes and activity are exported as JSON or deleted; shared items they created stay, without their user id. |
| AC-07 | Given the migration, then every existing row moves over with the same ids and counts per user, and the web shows the same list before and after (parity check, then the Prisma tracking models are removed). |

## 3. Design

- **Stack:** the cellkit template (FastAPI, psycopg on the Neon `-pooler` host, RLS by `app.workspace_id` → user id, Sentry with scrubbing, `/health` + `/ready`), copied into the repository (cells own their code).
- **Auth:** the web exchanges the NextAuth session for a token scoped to the user (`tracking:read`, `tracking:write`, audience `tracking-api`).
  - The issuer is platform-identity, through a service client.
  - The cell checks RS256, audience, scope and the gateway assertion.
- **Events:** none in v1, because nothing consumes them (no publisher, see the audit's note on publishers). Add a graph/outbox resource only when a consumer exists.
- **Migration:** copy the data with a one-off export/import against the migrator role. Apply `tracking-db migrate` before merging (memory: cell deploys don't migrate).

## 4. Cost and limits

| Item | Estimate |
|---|---|
| Neon | one new free project (quota is per project), 0.25 CU, scale to zero |
| Railway | one serverless service, sleeps when idle; estimated well under $1/month at current traffic (workspace at $3.39 of $50 on 2026-11-12) |
| Vercel | no new project; the web deploys as today |

## 5. Owner decision

| Q | Question | Options |
|---|---|---|
| Q1 | Approve building the cell (personal data, one Neon project, one Railway service) despite the proposed ADR-0011 freeze? | approve / keep the app as it is (accept `direct-db`) |
| Q2 | Sign-in: keep NextAuth in the web for now, or wait until identity signs end users in? | keep NextAuth (recommended) / wait |

## Implementation (2026-11-12)

- Cell: `bookchaowalit/productivity-tracking-api` (Neon `productivity-tracking-api`, Railway `tracking-api`, serverless,
  gateway route `tracking`, origin lock `report`). 35 tests on a real PostgreSQL, coverage 94 %.
- Identity: service client `tracking-web` (audience `tracking-api`, scopes `tracking.items:read|write`).
- The user travels in the path (`/v1/users/{userId}/tracking`) because the gateway forwards only standard headers.
- Web: `src/lib/tracking-cell.ts` + the internal route call the cell; analytics and the NextAuth user check stay
  here; Prisma keeps only the NextAuth models; `prisma/seed.ts` removed.

## การอนุมัติ

| Role | Status | Date | Sign-off |
|---|---|---|---|
| Owner (Accountable approver) | อนุมัติ | 2026-11-12 | "อนุมัติ SPEC-003" |
| Maker (Claude Code) | ร่างแล้ว | 2026-11-12 | — |
