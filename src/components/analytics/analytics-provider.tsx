"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { analytics } from '@/lib/browser-analytics'
import { ConsentBanner, ConsentChoicesLink, panelState } from './consent-banner'

// Sends a page view per route (path only), links the signed-in user's
// pseudonymous id, and shows the consent banner. Renders nothing while
// analytics is off (no flag or no key).
export function AnalyticsProvider() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const consent = useSyncExternalStore(analytics.subscribe, analytics.consent, () => 'unknown' as const)
  const [reopened, setReopened] = useState(false)
  const userId = status === 'authenticated' ? session?.user?.id : undefined
  const identified = useRef<string | null>(null)

  useEffect(() => {
    if (consent === 'granted' && pathname) analytics.page(pathname)
  }, [pathname, consent])

  useEffect(() => {
    if (consent !== 'granted') return
    if (userId && identified.current !== userId) {
      analytics.identify(userId)
      identified.current = userId
    } else if (!userId && status === 'unauthenticated' && identified.current) {
      // Sign-out: forget the link so the next visitor on this browser is new.
      analytics.reset()
      identified.current = null
    }
  }, [userId, status, consent])

  const choose = (value: 'granted' | 'denied') => {
    analytics.setConsent(value)
    setReopened(false)
  }

  const state = panelState(analytics.enabled, consent, reopened)
  if (state === 'hidden') return null
  if (state === 'choices') return <ConsentChoicesLink onOpen={() => setReopened(true)} />
  return <ConsentBanner onAccept={() => choose('granted')} onDecline={() => choose('denied')} />
}
