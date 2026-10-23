---
title: "SPEC-002 — Shared CI, security scan and errors-only Sentry"
status: implemented
tags: [spec, sdd, tdd, ci, sentry, security]
created: 2026-10-23
updated: 2026-10-23
description: "Run the shared platform CI and security scan on every push, clear the dependency findings, and report errors to Sentry without personal data."
---

# SPEC-002 — Shared CI, security scan and errors-only Sentry

Standard: [ADR-0004 — TDD + SDD](https://github.com/bookchaowalit/architecture-docs/blob/main/docs/architecture/decisions/ADR-0004-tdd-sdd-standard.md).
Plan: Big Loop, b-tier-b wave (L3 for Tier B showcases).

## Document control

| Field | Value |
|---|---|
| Spec ID / version | SPEC-002 / 1.0 |
| Status | implemented |
| Repository | bookchaowalit-website/productivity-tracking-web |
| Owner (maker) | Claude Code (b-tier-b repo agent) |
| Approver | Owner (bookchaowalit) |
| Autopilot | Separate from `.autopilot/` and `autopilot.yml` (untouched). The autopilot gates still run `npm test`, lint and build in their own workflow; `ci.yml` does not change their names or triggers. |

## 1. Problem and intent

- **Problem:** the only workflow was `autopilot.yml`; pushes by people or by the loop ran no CI and no security scan.
  The app reported no errors anywhere. A first scan found nodemailer 7.0.13 (11 advisories, up to 8.3), next's nested
  postcss 8.4.31 (4), postcss-selector-parser 6.1.4 and braces 3.0.3.
- **Outcome:** every push to `main` and every PR runs the shared `ci-node.yml` (lint, `tsc --noEmit`, `npm test`, build) and
  `security.yml` (gitleaks, Semgrep, OSV-Scanner, Trivy) pinned to platform-ci-workflows v1.1.1 (`87dc5e1`), green; runtime
  errors reach the Sentry project `personal-yu0/productivity-tracking-web` with no personal data.

## 2. Behaviour — scenarios

| AC | Given / When / Then | Test |
|---|---|---|
| AC-01 | Given a push to `main`, CI runs lint, typecheck, the node test suite and the build on a GitHub-hosted runner | `.github/workflows/ci.yml` — run 39906714882 green |
| AC-02 | Given no `NEXT_PUBLIC_SENTRY_DSN`, Sentry stays disabled | `tests/sentry.test.cjs` "stays disabled…" |
| AC-03 | With a DSN: errors only — no default PII, no tracing, no trace headers, no breadcrumbs, transactions dropped | `tests/sentry.test.cjs` "reports errors only…" |
| AC-04 | An event loses request, user, breadcrumbs, extra and stack-frame locals | `tests/sentry.test.cjs` "drops request data…", "removes local variables…" |
| AC-05 | An event loses the `nextjs` context (request_path) and every non-platform context; query strings are cut from the transaction and string tags; `tags.url` is dropped | `tests/sentry.test.cjs` "drops the request path…" |
| AC-06 | The security scan reports no unreviewed vulnerability | `security` job, run 39906714882 |

## 3. Red-first evidence

| Step | Result |
|---|---|
| `tests/sentry.test.cjs` before `src/lib/sentry.ts` existed | `ENOENT … src/lib/sentry.ts`, 98 pass / 1 fail |
| AC-05 case added against the first scrubber | 102 pass / 1 fail |
| After implementation | 103 / 103 pass; `tsc --noEmit` clean; `next lint` clean; `next build` OK |
| First CI run 39906179064 (CI only, before the dependency fix) | `web` green; `security` red on OSV + Trivy (findings above) → fixed in 17b5fde |

## 4. Interfaces and data

| Area | Change |
|---|---|
| Sentry | `@sentry/nextjs` ^11.8.0; `src/lib/sentry.ts` (options + `scrubEvent`), `src/instrumentation.ts` (server/edge, `onRequestError`), `src/instrumentation-client.ts` (browser). DSN from `NEXT_PUBLIC_SENTRY_DSN` (Vercel env, production + preview). No `withSentryConfig`, no source-map upload, no replay. |
| Dependencies | `nodemailer` ^7.0.13 → ^10.0.10 (used only by NextAuth's EmailProvider, which `src/lib/auth.ts` enables when `EMAIL_SERVER` and `EMAIL_FROM` are set; next-auth 4 declares an optional peer `^7`, so an `overrides` entry pins the same range). First pushed as a removal in 17b5fde, corrected to the upgrade in the docs commit. `overrides`: `postcss` ^8.5.31, `nodemailer` ^10.0.10, `sharp` ^0.35.5 (from the CVE patch). Lockfile written with npm 10 (autopilot runs Node 20, CI Node 22). Email sign-in on nodemailer 10 is not exercised by a test (no SMTP in CI); check once if the owner enables it. |
| Accepted findings | `osv-scanner.toml`: braces GHSA-vfj7-8cjw-p6xm (no fixed release) and postcss-selector-parser GHSA-rj75-hqrm-r3gf (fix only in 7.x; tailwindcss 3 needs 6.x). Both build-time only on first-party input; `ignoreUntil = 2027-01-31`. |

## 5. UI review sign-off

Built with `next build`, served with `next start`, captured with `shot.mjs` at 375/768/1440
(`~/work/b-tier-b/shots/productivity-tracking-web-sentry/`), every image opened and looked at:

- `/` at 375/768/1440: header, local-demo banner, search, category and status filters, stat tiles and the three sample
  cards render as before; no horizontal overflow at any width.
- `/more-projects` at 375/768/1440: renders; no overflow.
- Console: `/api/auth/session` 500 with NextAuth `NO_SECRET` — local run without `NEXTAUTH_SECRET`; environment-only,
  not caused by this change.
- Pre-existing, not in scope: the book sample shows "4/1 books" progress; `/more-projects` still lists old
  `*-frontend.vercel.app` URLs.

Sign-off: no visual change from this spec (it adds no UI); pass.

## 6. Out of scope

Deploying (no Git→Vercel link; owner action D9); PostHog (SPEC-001); Tailwind 4; the autopilot backlog (#6 typecheck script,
#9 header icons).

## 7. Deploy state

`https://tracking.bookchaowalit.com` returns 200 and serves the patch-only hotfix `277057e` (branch
`hotfix/next-cve-6d3931b`, Next 15.5.28 on top of production `6d3931b`), deployed by CLI on 2026-10-23 (D9a, per the parent session record). This spec's
commits on `main` (68b3b51, 88a4d34, 17b5fde, 6b8d8f6) are not live: Sentry starts reporting from production only after
the next owner-approved deploy, or once Vercel Git is reconnected to this repository (D9).
