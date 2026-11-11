import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"
import './design-floor/tokens.css'
import './app-theme.css'
import "./globals.css"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Providers } from "./providers"
import { SiteFooter, SITE_URL } from '@/components/site-footer'

const inter = Inter({ subsets: ["latin"] })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "TrackIt - Your Personal Content Tracker",
  description: "Track your manga, anime, movies, books, games, and more all in one place",
  keywords: ["tracking", "anime", "manga", "movies", "books", "games", "watch list"],
  authors: [{ name: "TrackIt" }],
  openGraph: {
    title: "TrackIt - Your Personal Content Tracker",
    description: "Track your manga, anime, movies, books, games, and more all in one place",
    type: "website",
    url: SITE_URL,
    siteName: 'TrackIt',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={geistMono.variable}>
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
        name: 'TrackIt',
        url: SITE_URL,
        description: 'TrackIt by Bookchaowalit - track manga, anime, movies, books, games and more in one place',
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
        name: 'TrackIt',
        url: SITE_URL,
      })
    }}
  />


        <Analytics />
        <SpeedInsights />
        <Providers>{children}</Providers>
        <SiteFooter />
      </body>
    </html>
  )
}

// SEO TODO: Add Open Graph tags for social sharing
