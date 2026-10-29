# TrackIt design direction

## Product world
TrackIt is a private media memory room. The core job is to find the next thing to watch, read, play, or finish without losing the state around it.

## Visual direction
- Seed: ac6091c1 — assigned sparse console dashboard atmosphere.
- Material: deep blue-black void, translucent depth planes, white particles, warm amber selection signal.
- Typography: quiet mono labels with restrained serif item titles.
- Composition: controls and counts establish the room; items become signals in a calm constellation.

## Interaction
- Existing search, category/status filters, favorites, status updates, ratings, progress, and add-item flow remain intact.
- Amber marks active/focused state; it is not used as a decorative badge everywhere.
- The mobile layout keeps the filter rail scrollable and keeps item actions reachable.

## Constraints
- Preserve API/Prisma/auth boundaries and do not expose private collection data in copy.
- Counts are derived from fetched items only; no invented metrics.
- Keep the empty, loading, and add-item states usable in the same visual world.
- Avoid turning every control into a rounded card.


## Design floor and tokens

Design floor 1.0.0 ([ADR-0007](https://github.com/bookchaowalit/architecture-docs/blob/main/docs/architecture/decisions/ADR-0007-central-design-floor-and-tokens.md), WCAG 2.2 AA), checked with `design-floor.json` and `check.mjs` on `/` and `/more-projects`.

- Vendored, unchanged: `src/app/design-floor/tokens.css` (header `css-vars` 1.0.0).
- `src/app/app-theme.css` points the token names at the existing shadcn variables (`--color-bg: hsl(var(--background))`, `--color-accent: hsl(var(--primary))`, and so on). shadcn on Tailwind v3 keeps bare HSL triplets, so `aliases/shadcn.css` does not fit this app and is not used.
- Single dark theme, no light mode. The interface is English only, so the Thai rules have nothing to check.
- Floor fixes:
  - Skip link to `#main-content` on both pages.
  - Accessible names on the status and rating selects and on the favourite toggle (which also gets `aria-pressed`).
  - The category tabs point `aria-controls` at the shared results region.
- Waivers: none.
