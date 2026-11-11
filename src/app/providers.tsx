"use client"

import { SessionProvider } from 'next-auth/react'
import { AnalyticsProvider, ConsentChoicesSlot } from '@/components/analytics/analytics-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AnalyticsProvider />
      {children}
      <ConsentChoicesSlot />
    </SessionProvider>
  )
}
