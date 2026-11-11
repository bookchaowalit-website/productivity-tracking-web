export const SITE_URL = 'https://tracking.bookchaowalit.com'
export const HUB_URL = 'https://bookchaowalit.com'

const linkClass = 'inline-flex min-h-11 items-center text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background px-4 pt-6 pb-16 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>TrackIt · personal media constellation</p>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4">
          <a href="/more-projects" className={linkClass}>More projects</a>
          <a href={HUB_URL} className={linkClass}>Back to bookchaowalit.com</a>
        </nav>
      </div>
    </footer>
  )
}
