# Mahila Action API server

Express + SQLite (via `better-sqlite3`) backend that replaces Supabase.
Handles admin authentication, site content, CMS data, and public form
submissions (donations, event reservations, vendor & volunteer sign-ups,
contact form).

**Important:** GitHub Pages only serves static files — it cannot run this
server. Deploy this `server/` folder separately (Render, Railway, Fly.io, a
VPS, etc.) and point the frontend's `VITE_API_URL` at it.

## Setup

```bash
cd server
npm install
cp .env.example .env
# edit .env: set CORS_ORIGIN to your GitHub Pages URL, and a real JWT_SECRET
npm run create-admin -- "admin@yourorg.org" "a-strong-password"
npm run dev
```

The API listens on `http://localhost:4000` by default. SQLite data lives in
`server/data/mahila.db` (created automatically, git-ignored).

## Endpoints

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`
- `GET /api/content`, `PUT /api/content` (admin), `PUT /api/content/:key` (admin)
- `GET /api/cms/events`, `/categories`, `/blog-posts`, `/councilors`, `/timeline`, `/contact-info`
  (all support `POST`/`PUT`/`DELETE` for admins)
- `POST /api/donations`, `/api/reservations`, `/api/vendors`, `/api/volunteers`, `/api/contact`
  (public writes; `GET`/`DELETE` require an admin session)

Admin auth uses an httpOnly, signed JWT cookie (12h expiry) — no tokens are
ever exposed to client-side JS.

## Production checklist

- Set `JWT_SECRET` to a long random value (see `.env.example` for how to generate one)
- Set `COOKIE_SECURE=true` once served over HTTPS
- Set `CORS_ORIGIN` to your real GitHub Pages origin (e.g. `https://yourorg.github.io`)
- Put this behind HTTPS (most hosts do this for you) and consider a reverse proxy rate limit in addition to the login limiter already applied
- Back up `server/data/mahila.db` regularly — it's the only copy of your data
