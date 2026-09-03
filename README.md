# Pinterest Auto Bot

Connect one Pinterest account, type a topic (or pick a trending one), and get a
fully optimized pin — AI-written title, description and hashtags, plus an
image from a 100% free source — ready to post now, schedule, or hand off to
**Autopilot** to invent and post pins entirely on its own.

Personal, single-user tool: one password gates the whole dashboard, and every
generation source (text + image) is free with no API cost.

## Stack

Next.js 16 (App Router) · Tailwind v4 · Supabase (Postgres + Storage) ·
Pinterest API v5 · Pollinations (free AI text + image, no key) · Pexels
(free stock photos, optional) · deployed on Vercel.

## 1. Create a Supabase project

1. [database.new](https://database.new) → create a project (free tier is fine).
2. **SQL Editor → New query** → paste the contents of [`supabase/schema.sql`](supabase/schema.sql) → Run.
   This creates the `app_settings`, `pins`, `boards_cache` tables and a
   public `pin-images` storage bucket.
3. **Project Settings → API** → copy the **Project URL** and the
   **`service_role` secret key** (not the `anon` key — the app talks to
   Postgres server-side only).

## 2. Create a Pinterest developer app

1. Go to <https://developers.pinterest.com/apps/> and sign in with the
   Pinterest account you want the bot to post to.
2. **Create app** → give it any name (e.g. "My Pin Bot").
3. Once created, open the app and note the **App ID** and **App secret**.
4. Under **Redirect URIs**, add:
   - `http://localhost:3000/api/pinterest/oauth/callback` (local dev)
   - `https://<your-deployed-domain>/api/pinterest/oauth/callback` (production, once deployed)
5. Pinterest apps start in **trial mode**, which is enough to connect your
   own account and post — no app review needed for personal use. (Review is
   only required if you want *other people's* accounts to connect.)

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in every value — see the comments in `.env.example` for where each one
comes from. `PEXELS_API_KEY` is optional: get a free key at
<https://www.pexels.com/api/> if you want the "stock photo" / "mixed" image
source; the AI image source works with zero configuration.

Generate `SESSION_SECRET` and `CRON_SECRET` with:

```bash
openssl rand -base64 32
```

## 4. Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, sign in with `ADMIN_PASSWORD`, then go to
**Settings → Connect** to link Pinterest, and **Boards** to pick a default
board.

## 5. Deploy to Vercel

1. Push this repo to GitHub, then import it in Vercel.
2. Add every variable from `.env.local` as a Vercel **Environment Variable**
   (Project Settings → Environment Variables). Set `NEXT_PUBLIC_SITE_URL`
   and `PINTEREST_REDIRECT_URI` to your real `https://…vercel.app` domain.
3. Add the same new redirect URI on the Pinterest app (step 2.4 above).
4. Deploy.

### Keeping the queue and Autopilot running

`vercel.json` already defines an hourly cron hitting
`/api/cron/process-queue`. Vercel automatically sends `CRON_SECRET` as a
bearer token, so nothing else to configure — **but** the free Hobby plan
limits how often Vercel Cron can fire. If you want Autopilot to check more
often than that allows, use a free external pinger instead (no Vercel plan
needed):

1. Create a free account at <https://cron-job.org> (or any similar service).
2. Point it at:
   `https://<your-domain>/api/cron/process-queue?secret=<CRON_SECRET>`
3. Set it to run every 15–30 minutes. Every guard in Autopilot is
   idempotent, so calling this more often than needed is harmless.

## How it works

- **Generate** — type a topic, the bot calls Pollinations' free text model
  for an SEO title/description/hashtags and either Pollinations' free image
  model or a free Pexels stock photo, re-hosts the image in your own
  Supabase Storage bucket (so it never breaks if the free provider goes
  down later), then lets you edit everything before you save it as a draft,
  schedule it, or post immediately.
- **Queue** — drafts and scheduled pins waiting to go out; reschedule, post
  now, or delete from here.
- **History** — everything already posted or that failed, with a link to
  the live pin and the error if it failed.
- **Boards** — the connected account's boards, and which one is the default.
- **Autopilot** (Settings) — when turned on, the cron job itself picks a
  topic (from Google Trends' free daily feed, falling back to a curated
  evergreen list), generates the pin, and posts it — no one has to click
  anything. Controlled by pins/day and allowed posting hours, in your
  timezone.

## Notes on the free resources

- **Pollinations** (text + image) is a free, keyless community service with
  no uptime SLA — the app retries once and falls back gracefully (a
  templated caption, or the other image source) rather than ever hard
  failing a generation.
- **Google Trends** trending topics are pulled from an unofficial, undocumented
  RSS feed and can silently change shape; the evergreen topic list is the
  reliable fallback.
- **Pexels** is free but does require your own free API key (rate-limited
  per key, generous for personal use).
