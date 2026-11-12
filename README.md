# TrackIt - Personal Content Tracker

A comprehensive web application for tracking your manga, anime, movies, books, games, podcasts, websites, and more. Built with Next.js 14, Tailwind CSS, shadcn/ui, and PostgreSQL.


> **Backend (since 2026-11-12, SPEC-003):** tracking data and rules live in the tracking cell
> [bookchaowalit/productivity-tracking-api](https://github.com/bookchaowalit/productivity-tracking-api), reached at
> `https://gateway.bookchaowalit.com/v1/tracking` with a platform-identity token (service client `tracking-web`).
> This app keeps sign-in (NextAuth tables in its own Postgres) and product analytics. Configure
> `TRACKING_API_URL`, `TRACKING_CLIENT_ID` and `TRACKING_CLIENT_PRIVATE_KEY_PEM_B64` (Infisical
> `/productivity-tracking-api`). `DATABASE_URL` is now only for NextAuth. `npm run seed` was removed with the
> Prisma tracking models; the old tracking tables stay in the database as a rollback copy.

## 🚀 Features

- **Multi-Category Tracking**: Track 9 different content categories
  - Anime & Manga
  - Movies & TV Shows
  - Books
  - Games
  - Podcasts
  - Websites
  - Custom/Other content

- **Status Management**: Track content status
  - Plan to Watch/Read
  - Watching/Reading
  - Completed
  - On Hold
  - Dropped

- **Rating System**: 10-point rating scale for all content

- **Progress Tracking**: Track episodes, chapters, or book progress

- **Favorites System**: Mark your favorite items for quick access

- **Advanced Filtering**: Filter by category, status, favorites, and search

- **Statistics Dashboard**: Overview of your tracking statistics

- **Activity Logging**: Automatic logging of user activities

- **Responsive Design**: Beautiful, mobile-first UI with dark mode support

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: PostgreSQL (DigitalOcean)
- **ORM**: Prisma
- **Deployment**: Vercel (Edge Functions)
- **Authentication**: NextAuth.js (ready for integration)
- **TypeScript**: Full type safety

## 📋 Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- PostgreSQL database (we use DigitalOcean Managed Database)
- Git for version control

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd book_tracking
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Set Up Environment Variables

Copy the `.env.local` file and update it with your actual credentials:

```bash
cp .env.local.example .env.local
```

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://doadmin:YOUR_PASSWORD@db-postgresql-sgp1-04384-do-user-16924107-0.f.db.ondigitalocean.com:25060/defaultdb?sslmode=require&pgbouncer=true"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"

# App
NODE_ENV="development"
```

**Generate a secure NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
```

### 4. Set Up Database

Run Prisma migrations to create the database schema:

```bash
npx prisma generate
npx prisma db push
# or for production:
npx prisma migrate deploy
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🗄️ Database Schema

The application uses the following main models:

- **User**: User accounts and profiles
- **TrackingItem**: Content items (anime, manga, movies, etc.)
- **UserTracking**: User's relationship with items (status, rating, progress)
- **TrackingNote**: Notes and comments
- **ActivityLog**: User activity history

## 📁 Project Structure

```
book_tracking/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── tracking/          # API routes (Edge Functions)
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Main dashboard
│   │   └── globals.css            # Global styles
│   ├── components/
│   │   └── ui/                    # shadcn/ui components
│   └── lib/
│       ├── prisma.ts              # Prisma client
│       └── utils.ts               # Utility functions
├── prisma/
│   └── schema.prisma              # Database schema
├── public/                        # Static assets
├── .env.local                     # Environment variables
├── next.config.js                 # Next.js configuration
├── tailwind.config.ts             # Tailwind configuration
└── tsconfig.json                  # TypeScript configuration
```

## 🚢 Deployment to Vercel

### 1. Prepare for Production

Ensure your environment variables are set in Vercel:

- `DATABASE_URL`: Your DigitalOcean PostgreSQL connection string
- `NEXTAUTH_URL`: Your production URL (e.g., https://your-app.vercel.app)
- `NEXTAUTH_SECRET`: A secure secret key
- `INTERNAL_API_SECRET`: A secret value **used only internally** — Edge functions forward requests to the internal Node handlers using this header (`x-internal-secret`). Set the same secret in Vercel and keep it private.

### 2. Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

#### Option B: Using Git Push

1. Push your code to GitHub/GitLab/Bitbucket
2. Import project in Vercel dashboard
3. Configure environment variables
4. Deploy

### 3. Run Database Migrations on Vercel

After deployment, run:

```bash
npx prisma migrate deploy
```

### 4. Edge Functions Configuration

The application uses Edge Functions for API routes. Ensure your `vercel.json` includes:

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "runtime": "edge"
    }
  }
}
```

## 📚 Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm start           # Start production server

# Database
npx prisma generate # Generate Prisma Client
npx prisma db push   # Push schema to database
npx prisma studio    # Open Prisma Studio

# Code Quality
npm run lint        # Run ESLint
```

## 🔐 Database Connection (DigitalOcean)

The application is configured to use DigitalOcean Managed PostgreSQL Database:

- **Host**: `db-postgresql-sgp1-04384-do-user-16924107-0.f.db.ondigitalocean.com`
- **Port**: `25060`
- **Database**: `defaultdb`
- **SSL Mode**: `require`

**Connection String Format:**
```
postgresql://doadmin:PASSWORD@HOST:PORT/DATABASE?sslmode=require&pgbouncer=true
```

## 🎨 Customization

### Adding New Categories

Edit `prisma/schema.prisma` and add to `ContentCategory` enum:

```prisma
enum ContentCategory {
  ANIME
  MANGA
  MOVIE
  # ... existing categories
  YOUR_NEW_CATEGORY
}
```

Then regenerate Prisma Client:

```bash
npx prisma generate
```

### Customizing UI Colors

Edit `src/app/globals.css` and modify the CSS variables in the `:root` selector.

## 🐛 Troubleshooting

### Database Connection Issues

- Ensure your DigitalOcean database allows connections from your IP
- Verify SSL mode is set to `require`
- Check that `pgbouncer=true` is in the connection string

### Prisma Generation Fails

```bash
# Clear Prisma cache
npx prisma generate --force

# Reset database (caution: deletes data)
npx prisma migrate reset
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [DigitalOcean](https://www.digitalocean.com/)
- [Vercel](https://vercel.com/)

## 📞 Support

For support, email support@yourdomain.com or open an issue in the repository.

## Architecture note: the Edge/Node split

`/api/tracking` runs on the Edge runtime and is the only public-facing
tracking endpoint. It used to forward `GET` requests to
`/api/internal/tracking` with the shared `x-internal-secret` attached, and the
internal route filtered only by the client-supplied `userId` query parameter,
so anyone who knew a `userId` could read that user's list (IDOR, threat model
TM-07). No session system exists yet (NextAuth is a dependency but is not
configured), so there is no authenticated identity to authorise a read.
Until one exists the public endpoint **fails closed**: every `GET` returns
JSON `401` with `Cache-Control: no-store`, nothing is forwarded, and the
internal secret is never read or attached. Other methods still return JSON
`405` with `Allow: GET` before reading a body. The UI falls back to its
browser-local demo mode on the `401`.

`/api/internal/tracking` (Node.js runtime, where Prisma runs) still requires
`x-internal-secret` to match `INTERNAL_API_SECRET`; direct requests without it
return `401`. Re-enabling remote reads needs real authentication that derives
`userId` server-side from the session and rejects a client-supplied `userId`
that differs. `npm test` exercises both routes with stubbed upstream/database
and never connects to a database.

## Notes from a recent audit pass

- **A byte-for-byte duplicate of the internal tracking route existed at
  `api/_internal/tracking/`, and it was completely dead code** — Next.js
  App Router excludes any folder prefixed with `_` from routing entirely
  (that's the documented "private folder" convention), so this route was
  never reachable, not even from `/api/tracking`'s own same-origin
  `fetch`, which still pointed at the non-underscored `internal` path.
  Confirmed by an actual `next build`: the route table only ever listed
  `/api/internal/tracking`. Removed the dead duplicate.
- **`/api/mcp` referenced an undefined `requestId` variable on every
  single response path** — a real `ReferenceError` on every call, caught
  silently by the route's own outer `try/catch` and returned as a
  misleading `"Parse error"` instead of the real result. Masked from
  `tsc`/`next build` by `typescript: { ignoreBuildErrors: true }` in
  `next.config.js`. Fixed by actually reading `id` from the request body;
  removed the ignore flags (along with `eslint.ignoreDuringBuilds`, also
  masking real signal) now that both are clean.
- `npm run seed` failed outright when actually run — `ts-node
  --compiler-options {"module":"CommonJS"}` needs the JSON blob quoted as
  a single shell argument, but the outer quotes were missing, so the
  shell split it into `{module:CommonJS}` and `ts-node` rejected it as
  invalid JSON. Fixed the script's quoting; verified live — the seed now
  creates a real user and 16 tracking items across all 9 categories.
- Historical verification before the public proxy became read-only: the full
  CRUD path was exercised against a real (throwaway, local)
  PostgreSQL instance: `GET /api/tracking` returns real seeded data
  through the Edge→Node proxy, `POST /api/tracking` creates a real row
  (verified by a follow-up `GET` showing the count increase), and the
  `_internal` route's removal doesn't break anything since it was never
  live to begin with.
- The same dead `categories` object in `more-projects/page.tsx` found in
  several sibling repos this pass — defined, never referenced.
- `next` was already floating on `^14.2.0`; `npm audit fix` pulled the
  latest compatible patch (`14.2.35`), clearing 9 of 14 `npm audit`
  findings. The remaining 5 all require Next 16, not attempted here.
- **Note on `tools/call` in the MCP server**: it's currently a stub —
  every tool call returns `"Implement your tracking logic here"` rather
  than hitting the real tracking API. Worth being upfront about this if
  it comes up: `tools/list` correctly advertises 4 real tool schemas, but
  none of them are wired to `/api/tracking` yet.

## Related

- **Mobile App:** [bookchaowalit-tracking-mobile](https://github.com/bookchaowalit-mobile/bookchaowalit-tracking-mobile)
- **Portfolio:** [bookchaowalit.com](https://bookchaowalit.com)

