import { Button } from '@/components/ui/button'
import type { Consent } from '@/lib/browser-analytics'

// PDPA consent for browser analytics (ADR-0005 D-5). Shown only when analytics
// is configured; nothing is sent until "Allow analytics". Both choices have the
// same weight, and the choice can be changed later from "Analytics choices".
export type PanelState = 'hidden' | 'banner' | 'choices'

export function panelState(enabled: boolean, consent: Consent, reopened: boolean): PanelState {
  if (!enabled) return 'hidden'
  return consent === 'unknown' || reopened ? 'banner' : 'choices'
}

// The banner sits in the page flow above the content (Providers renders it
// first), so it never covers the stats or the list and never hides a focused
// control. When reopened from "Analytics choices" it is scrolled into view and
// focused, so the choices are on screen even on a long page.
export function revealBanner(el: HTMLElement | null) {
  if (!el) return
  el.scrollIntoView?.({ block: 'start' })
  el.focus({ preventScroll: true })
}

export function ConsentBanner({
  onAccept,
  onDecline,
  reveal = false,
}: {
  onAccept: () => void
  onDecline: () => void
  reveal?: boolean
}) {
  return (
    <div
      ref={reveal ? revealBanner : undefined}
      tabIndex={-1}
      role="region"
      aria-label="Analytics consent"
      className="relative z-50 mx-auto my-3 w-[calc(100%-2rem)] max-w-xl rounded-md border border-border bg-background p-3 text-sm shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="text-foreground">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Analytics · </span>
        May TrackIt count which features you use? Only if you allow it, counts go to PostHog (EU servers). Titles,
        notes, searches, names and emails are never sent.
      </p>
      <div className="mt-3 flex flex-row justify-end gap-2">
        <Button variant="outline" size="default" className="min-h-11 flex-1 sm:flex-none" onClick={onDecline}>Decline</Button>
        <Button variant="outline" size="default" className="min-h-11 flex-1 sm:flex-none" onClick={onAccept}>Allow analytics</Button>
      </div>
    </div>
  )
}

// "Analytics choices" sits in the page flow just above the footer (never
// floating over content). It asks the provider at the top of the page to reopen
// the banner through this window event.
export const REOPEN_EVENT = 'trackit:analytics-choices'

export function ConsentChoicesLink({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-2">
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex min-h-11 items-center rounded px-2 font-mono text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Analytics choices
      </button>
    </div>
  )
}
