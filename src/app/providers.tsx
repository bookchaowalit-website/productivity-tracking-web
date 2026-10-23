"use client"

import { SessionProvider } from 'next-auth/react'
import { AnalyticsProvider } from '@/components/analytics/analytics-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <AnalyticsProvider />
    </SessionProvider>
  )
}
