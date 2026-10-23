# Product

<!-- impeccable:product-schema 1 -->

> Product truth inferred from the existing README, schema, routes, and implementation. Confirm any missing product decisions in a future init pass.

## Platform

web

## Users

A person managing a personal watch/read/play/listen queue across several kinds of media.

## Product Purpose

TrackIt records content items, their status, progress, ratings, favorites, notes, and activity in one personal dashboard. Success means the user can find an item, understand its current state, and update the next action without losing context.

## Positioning

It is a cross-media personal tracker with one shared status and progress model, rather than separate watchlists for each medium.

## Capabilities and Constraints

- Categories include anime, manga, movies, TV, books, games, podcasts, websites, and other content.
- Search, filtering, ratings, favorites, progress, and activity logging are part of the existing product.
- The implementation uses Next.js, Prisma, PostgreSQL, and local authentication configuration.
- Keep database and authentication behavior intact; do not claim public users or production SLAs.

## Evidence on Hand

- `prisma/schema.prisma`
- `src/app/page.tsx`
- Existing README, seed data, and UI components.

## Product Principles

- The next action should be easier to see than the data model.
- A single personal queue can hold different media without flattening their context.
- Progress and status remain editable, visible, and honest.

## Status today (2026-10-23)

- **What it is:** TrackIt, a personal cross-media tracker (status, progress, ratings, favorites, notes, activity) on
  Next.js 15, Prisma/PostgreSQL and NextAuth (Google, GitHub, Discord or email magic link, each enabled only when its
  credentials are configured). It is not an analytics tracking pixel; an older portfolio card said so and was corrected
  (`portfolio-site-web` CARD-CLAIMS-REVIEW-2026-10).
- **Works:** the home page renders a local demo workspace (three sample items; changes stay in the browser until sign-in);
  `/api/tracking` is the session-scoped API and returns 401 without a session; writes require a session (TM-07 fix).
  103 automated tests run on every push (shared CI + security scan). Errors go to Sentry with personal data stripped
  (SPEC-002), once a build with it is deployed.
- **Does not work / not verified:** on the live site `/api/auth/session` and `/api/auth/providers` return 404, so sign-in
  on production is unverified; no real users or usage numbers are claimed (`TRUTH-PASS.md`). Product analytics (SPEC-001)
  stays dark until a PostHog key exists (D4).
- **Live:** https://tracking.bookchaowalit.com (200). Production is the patch-only hotfix of `6d3931b` with Next 15.5.28
  (CLI deploy 2026-10-23, D9a). `main` is ahead (autopilot work, SPEC-002) and is not live: the Vercel project is linked to
  the old repository name, so pushes do not deploy (owner action D9).
