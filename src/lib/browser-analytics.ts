// Browser product analytics (ADR-0005 layer 2, Big Loop W4 pilot).
// Provider-neutral: pages call track / identify / page here and never import
// PostHog. It is a no-op unless NEXT_PUBLIC_ANALYTICS_ENABLED is exactly
// "true", NEXT_PUBLIC_POSTHOG_KEY is set, and the visitor accepted the consent
// banner. Before consent the SDK is not even downloaded, so there are no
// cookies, no storage and no requests (stricter than PostHog's cookieless
// mode). Event catalog: docs/measurement/EVENTS.md.
import { loadPostHog } from './posthog-adapter'

export const PRODUCT = 'trackit'
export const DEFAULT_HOST = 'https://eu.i.posthog.com'
export const CONSENT_KEY = 'trackit.analytics-consent.v1'
// Set while PostHog holds an identified user, so a sign-out seen on a later
// page load still resets it (the next visitor on this browser starts anonymous).
export const IDENTIFIED_KEY = 'trackit.analytics-identified.v1'

export type Consent = 'granted' | 'denied' | 'unknown'
export type EventProps = Record<string, string | number | boolean>

export interface AnalyticsConfig {
  key: string
  host: string
}

export interface AnalyticsAdapter {
  track(_event: string, _props: EventProps): void
  identify(_id: string): void
  page(_path: string): void
  optOut(): void
  reset(): void
}

export type AdapterLoader = (_config: AnalyticsConfig) => Promise<AnalyticsAdapter>

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

// Every browser event and the only values each property may take. Anything not
// listed (titles, search text, emails, URLs) is dropped before it reaches the
// adapter. Keep in step with docs/measurement/EVENTS.md (tests/event-catalog).
export const BROWSER_EVENTS: Record<string, Record<string, readonly string[]>> = {
  collection_filtered: { filter: ['search', 'category', 'status', 'favorites'] },
}

// Pseudonymous ids only: cuid / uuid style, no spaces, no "@".
const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/
const ID_SEGMENT = [
  /^\d+$/,
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  /^c[a-z0-9]{20,}$/i,
  /^[0-9a-f]{12,}$/i,
  /@/,
]

export function readConfig(
  env: { enabled?: string; key?: string; host?: string } = {
    // Literal references so Next inlines them into the client bundle.
    enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
): AnalyticsConfig | null {
  const key = env.key?.trim()
  if (env.enabled !== 'true' || !key) return null
  return { key, host: (env.host?.trim() || DEFAULT_HOST).replace(/\/+$/, '') }
}

// Path only: no origin, query string or fragment; id-like segments become ":id".
export function sanitizePath(url: string): string {
  let pathname = '/'
  try {
    pathname = new URL(url, 'http://local.invalid').pathname
  } catch {
    return '/'
  }
  return pathname
    .split('/')
    .map((segment) => {
      let decoded = segment
      try {
        decoded = decodeURIComponent(segment)
      } catch {
        // keep the raw segment
      }
      return ID_SEGMENT.some((pattern) => pattern.test(decoded)) ? ':id' : segment
    })
    .join('/')
}

export function sanitizeProps(event: string, props: Record<string, unknown> = {}): EventProps | null {
  const allowed = Object.prototype.hasOwnProperty.call(BROWSER_EVENTS, event) ? BROWSER_EVENTS[event] : null
  if (!allowed) return null
  const clean: EventProps = {}
  for (const [key, values] of Object.entries(allowed)) {
    const value = props[key]
    // Every listed property is required: an event with a value off the list is
    // dropped whole rather than sent half-empty.
    if (typeof value !== 'string' || !values.includes(value)) return null
    clean[key] = value
  }
  return { ...clean, product: PRODUCT }
}

function browserStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function readConsent(storage: StorageLike | null): Consent {
  try {
    const value = storage?.getItem(CONSENT_KEY)
    return value === 'granted' || value === 'denied' ? value : 'unknown'
  } catch {
    return 'unknown'
  }
}

export function createAnalytics({
  config,
  load,
  storage = browserStorage(),
}: {
  config: AnalyticsConfig | null
  load: AdapterLoader
  storage?: StorageLike | null
}) {
  let consent: Consent = config ? readConsent(storage) : 'unknown'
  let adapter: Promise<AnalyticsAdapter | null> | null = null
  const listeners = new Set<(_value: Consent) => void>()

  const mark = (identified: boolean) => {
    try {
      if (identified) storage?.setItem(IDENTIFIED_KEY, '1')
      else storage?.removeItem(IDENTIFIED_KEY)
    } catch {
      // private mode: nothing persisted, nothing to forget
    }
  }
  const isMarked = () => {
    try {
      return storage?.getItem(IDENTIFIED_KEY) === '1'
    } catch {
      return false
    }
  }

  const withAdapter = (call: (_adapter: AnalyticsAdapter) => void) => {
    if (!config || consent !== 'granted') return
    // A failed SDK download must never break the page.
    adapter ??= load(config).catch(() => null)
    void adapter.then((a) => {
      if (a && consent === 'granted') call(a)
    })
  }

  return {
    enabled: config !== null,
    consent: () => consent,
    setConsent(value: 'granted' | 'denied') {
      if (!config) return
      const wasGranted = consent === 'granted'
      consent = value
      try {
        storage?.setItem(CONSENT_KEY, value)
      } catch {
        // private mode: the choice lasts for this page view only
      }
      // optOut also resets the stored identity. Without a loaded SDK nothing has
      // been reset yet, so the marker stays and a later sign-out still resets.
      if (value === 'denied' && wasGranted && adapter) {
        void adapter.then((a) => {
          if (!a) return
          a.optOut()
          mark(false)
        })
      }
      listeners.forEach((listener) => listener(value))
    },
    subscribe(listener: (_value: Consent) => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    track(event: string, props: Record<string, unknown> = {}) {
      const clean = sanitizeProps(event, props)
      if (clean) withAdapter((a) => a.track(event, clean))
    },
    identify(id: string) {
      if (!ID_PATTERN.test(id) || !config || consent !== 'granted') return
      mark(true)
      withAdapter((a) => a.identify(id))
    },
    page(url: string) {
      const path = sanitizePath(url)
      withAdapter((a) => a.page(path))
    },
    // Call whenever the visitor is signed out: resets only if a user was
    // identified on this browser, so anonymous visits keep one anonymous id.
    forgetIdentity() {
      if (!config || consent !== 'granted' || !isMarked()) return
      // The marker is cleared only once the reset has really run.
      withAdapter((a) => {
        a.reset()
        mark(false)
      })
    },
  }
}

export type Analytics = ReturnType<typeof createAnalytics>

export const analytics: Analytics = createAnalytics({ config: readConfig(), load: loadPostHog })
