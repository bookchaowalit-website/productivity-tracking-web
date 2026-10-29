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

// WCAG 2.4.11: the fixed banner must not hide the focused control. While it is
// shown, its height (plus the bottom gap) is reserved as scroll padding, so
// focusing a control behind it scrolls the control above the banner, and the
// same space is added below the page so the last row can scroll clear too.
const BANNER_GAP_PX = 32

export function reserveScrollSpace(el: HTMLElement | null) {
  if (!el || typeof ResizeObserver === 'undefined') return
  const root = document.documentElement
  const apply = () => {
    const space = `${el.offsetHeight + BANNER_GAP_PX}px`
    root.style.scrollPaddingBottom = space
    document.body.style.paddingBottom = space
  }
  apply()
  const observer = new ResizeObserver(apply)
  observer.observe(el)
  return () => {
    observer.disconnect()
    root.style.scrollPaddingBottom = ''
    document.body.style.paddingBottom = ''
  }
}

export function ConsentBanner({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <div
      ref={reserveScrollSpace}
      role="region"
      aria-label="Analytics consent"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-md border border-border bg-background/95 p-4 text-sm shadow-lg backdrop-blur"
    >
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Analytics</p>
      <p className="mt-2 text-foreground">
        May TrackIt count which features you use? Counts go to PostHog (EU servers) only if you allow it. Titles,
        notes, searches, names and emails are never sent.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" size="default" onClick={onDecline}>Decline</Button>
        <Button variant="outline" size="default" onClick={onAccept}>Allow analytics</Button>
      </div>
    </div>
  )
}

export function ConsentChoicesLink({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed bottom-2 left-2 z-40 rounded px-2 py-1 font-mono text-xs text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Analytics choices
    </button>
  )
}
