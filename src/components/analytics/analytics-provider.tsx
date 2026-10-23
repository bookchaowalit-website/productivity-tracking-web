"use client"

import { useEffect, useState, useSyncExternalStore } from 'react'
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

  useEffect(() => {
    if (consent === 'granted' && pathname) analytics.page(pathname)
  }, [pathname, consent])

  useEffect(() => {
    if (consent !== 'granted') return
    if (userId) analytics.identify(userId)
    // Signed out (now, or before this page load): forget any stored identity.
    else if (status === 'unauthenticated') analytics.forgetIdentity()
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
