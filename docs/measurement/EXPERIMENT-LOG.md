---
title: TrackIt — Experiment Log
status: draft
created: 2026-10-23
updated: 2026-10-23
description: Pre-registered product experiments for TrackIt. Empty until events are live and the first outcome review (OR-101) proposes a test.
---

# TrackIt — Experiment Log

Prepared from architecture-docs `templates/sdlc/experiment-log.md`. Fill
sections 1–4 of a card **before** the experiment starts and do not edit them
afterwards. PostHog feature flags are switched off in the browser adapter
(`advanced_disable_flags`) until the first approved card needs them.

## Document control

| Field | Value |
|---|---|
| Project / product ID | TrackIt (`bookchaowalit-website/productivity-tracking-web`) |
| Log owner | Owner (bookchaowalit) |
| Version | 0.1 |
| Status | active — no experiments yet (pending go-live) |
| KPI source | [KPI-PLAN.md](KPI-PLAN.md) |
| Experiment tooling | PostHog feature flags (EU), randomised on `User.id` — off until needed |
| AI maker | Claude Code |
| AI reviewer | Fresh read-only Claude reviewer per card |
| Last updated | 2026-10-23 |
| Next review | with OR-101 (go-live + 30 days) |

## Register

| EXP ID | Title | Phase | Primary KPI | Status | Start | End | Decision | Card |
|---|---|---|---|---|---|---|---|---|

No experiments yet. A follow-up task from an experiment uses key
`experiment/<EXP-id>` (set by hand: the sync worker does not read this file).
