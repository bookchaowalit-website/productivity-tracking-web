# Truth-pass (BD-028) — bookchaowalit-tracking-frontend

**Date:** 2026-08-11  
**Tier:** B (showcase)  
**Title (from README):** TrackIt - Personal Content Tracker

## Who / problem

See README for product narrative. This file records an honest portfolio claim class only.

## How to run

```bash
# From this repository root
npm install   # or npm ci if lockfile present
npm run dev
# production build (if available)
npm run build
# automated tests (node --test)
npm test
```

Package name: `book-tracking`  
Scripts seen: dev, build, start, lint, test, postinstall, prisma:generate, prisma:push, prisma:migrate, prisma:deploy, prisma:studio, prisma:reset, seed  
Docker marker: no  
Tests signal: yes — `npm test` runs `node --test tests/*.test.cjs` (6 suites, 98 tests passing on 2026-10-22)

## Claim classes

| Claim | Class |
|---|---|
| README describes purpose | Observed |
| Local install + dev server works on this machine | Planned (not re-verified this pass) |
| Production users / revenue | **Not claimed** |
| Store / public SLA | **Not claimed** |

## Limitations (honest)

- Automated tests exist: `npm test` (`node --test tests/*.test.cjs`) runs the `analytics`, `internal-tracking`, `tracking-analytics`, `tracking-auth`, `tracking-proxy` and `tracking-writes` suites against in-memory fixtures and mocked `fetch`; shared loader in `tests/helpers/`.
- The suites cover server routes and helpers only; there are no browser/UI end-to-end tests, and nothing here was run against a real database or production.
- PRODUCT.md exists, but this remains showcase depth, not a full interview case study.

## Do not

- Inflate metrics or invent live customer counts
- Promote website empty twins over canonical game/products owners
- Bulk-commit unrelated dirty files without review
