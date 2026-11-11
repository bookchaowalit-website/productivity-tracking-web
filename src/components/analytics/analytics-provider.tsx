"use client"

import { useEffect, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { analytics } from '@/lib/browser-analytics'
import { ConsentBanner, ConsentChoicesLink, REOPEN_EVENT, panelState } from './consent-banner'

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

  useEffect(() => {
    const reopen = () => setReopened(true)
    window.addEventListener(REOPEN_EVENT, reopen)
    return () => window.removeEventListener(REOPEN_EVENT, reopen)
  }, [])

  const choose = (value: 'granted' | 'denied') => {
    analytics.setConsent(value)
    setReopened(false)
  }

  const state = panelState(analytics.enabled, consent, reopened)
  if (state === 'hidden') return null
  if (state === 'choices') return null
  return <ConsentBanner reveal={reopened} onAccept={() => choose('granted')} onDecline={() => choose('denied')} />
}

// Rendered after the page content: the small "Analytics choices" link once a
// choice is stored. It reopens the banner at the top of the page.
export function ConsentChoicesSlot() {
  const consent = useSyncExternalStore(analytics.subscribe, analytics.consent, () => 'unknown' as const)
  if (panelState(analytics.enabled, consent, false) !== 'choices') return null
  return <ConsentChoicesLink onOpen={() => window.dispatchEvent(new Event(REOPEN_EVENT))} />
}
