import type { Metadata } from "next"
import { Inter } from "next/font/google"
import './design-floor/tokens.css'
import './app-theme.css'
import "./globals.css"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Providers } from "./providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TrackIt - Your Personal Content Tracker",
  description: "Track your manga, anime, movies, books, games, and more all in one place",
  keywords: ["tracking", "anime", "manga", "movies", "books", "games", "watch list"],
  authors: [{ name: "TrackIt" }],
  openGraph: {
    title: "TrackIt - Your Personal Content Tracker",
    description: "Track your manga, anime, movies, books, games, and more all in one place",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        {/* THESIS: TrackIt is a private memory room for unfinished media, not a generic admin grid. OWN-WORLD: a deep blue-black constellation with warm amber selection makes each item feel like a signal in depth. STORY: search the room, tune a status, return to the next thing. FIRST VIEWPORT: show the collection controls and live counts without exposing private content claims. FORM: seed ac6091c1 / assigned sparse console dashboard atmosphere, used as depth, particles, and selected warm signal. FINISH: thin telemetry rules, calm cards, keyboard-like labels, and no decorative metrics beyond the actual collection. */}
  {/* Structured Data for SEO */}
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Tracking',
        url: 'https://bookchaowalit-tracking.vercel.app',
        description: 'Tracking by Bookchaowalit - A modern web application',
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD'
        },
        author: {
          '@type': 'Person',
          name: 'Bookchaowalit',
          url: 'https://bookchaowalit.com'
        },
        publisher: {
          '@type': 'Organization',
          name: 'Bookchaowalit',
          url: 'https://bookchaowalit.com'
        }
      })
    }}
  />

  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Tracking',
        url: 'https://bookchaowalit-tracking.vercel.app',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://bookchaowalit-tracking.vercel.app/more-projects',
          'query-input': 'required name=search_term'
        }
      })
    }}
  />


        <Analytics />
        <SpeedInsights />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

// SEO TODO: Add Open Graph tags for social sharing
