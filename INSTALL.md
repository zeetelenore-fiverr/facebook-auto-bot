# Installation guide

This walks through a complete install, from nothing to a bot publishing to your
Facebook Page. It takes about 20 minutes. Everything used here is free.

You do **not** need to write code, own a website, or pay for anything. You do need
a Facebook **Page** — Meta removed personal-profile publishing in 2018, so the API
can only post to Pages. Creating one is free and takes two minutes.

---

## Step 1 — Database (Supabase)

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New project**. Give it any name, pick a region near you, and set a
   database password. Save that password somewhere — you won't need it for this
   app, but Supabase will ask for it later if you ever connect directly.
3. Wait for the project to finish provisioning (about a minute).
4. Open **SQL Editor** in the left sidebar → **New query**.
5. Open [`supabase/schema.sql`](supabase/schema.sql) from this repository, copy the
   whole file, paste it into the editor, and click **Run**. It should say Success.
6. Go to **Project Settings → API** and copy two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **`service_role` key** — under Project API keys, click *Reveal* on the
     `service_role` row

> The `service_role` key bypasses row-level security. It is only ever used on the
> server, never sent to a browser. Do not paste it anywhere public.

---

## Step 2 — Deploy (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New → Project**, then import this repository. If it is not yours,
   fork it first — Vercel can only deploy repositories on your account.
3. Before clicking Deploy, open **Environment Variables** and add these four:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | The Project URL from step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | The `service_role` key from step 1 |
   | `ADMIN_PASSWORD` | Any password you choose — this opens your dashboard |
   | `SESSION_SECRET` | Any long random string (see below) |

   For `SESSION_SECRET`, any long random text works. If you want a good one, open
   your browser's console (F12) on any page and run:

   ```js
   crypto.randomUUID() + crypto.randomUUID()
   ```

4. Click **Deploy** and wait for the build.
5. Open your new URL and sign in with the `ADMIN_PASSWORD` you chose.

At this point everything works **except** publishing to Facebook. You can already
generate topics, copy and images.

---

## Step 3 — Meta app

This is the part people expect to be hard. It is not: posting to a Page **you
administer** uses Standard Access, which every Meta app is
[approved for automatically](https://developers.facebook.com/docs/graph-api/overview/access-levels/).
There is no App Review, no demo video, and no business verification.

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and
   click **Create app**. You may be asked to register as a developer first — it is
   free and instant.
2. Enter an **app name** (anything) and your contact email.
3. **Use case** — choose the Page-management one, usually shown as
   **"Manage everything on your Page"**.

   > Do **not** pick *"Authenticate and request data from users with Facebook
   > Login"*. Meta treats that use case as incompatible with Page management, and
   > you will not be able to request the posting permissions afterwards. If your
   > dashboard shows different wording, pick **Other → Business**, then add the
   > **Facebook Login** product manually from the Products list.

4. Connect a **Business portfolio** if prompted, or create one. This is free.
5. Once the app exists, open **App settings → Basic** and copy:
   - **App ID**
   - **App Secret** (click *Show*)
6. Leave the app in **Development** mode. That is all Standard Access needs, and
   switching to Live would require a privacy policy you don't need yet.

---

## Step 4 — Connect the two

1. In your deployed app, go to **Settings**.
2. In the **Meta app** card, paste the **App ID** and **App Secret**, then click
   **Save credentials**. No redeploy is needed.
3. Still on that card, copy the **Redirect URI** shown (use the Copy button). It
   looks like:

   ```
   https://your-app.vercel.app/api/facebook/oauth/callback
   ```

4. Back in your Meta app dashboard, open **Facebook Login → Settings** and paste
   that URI into **Valid OAuth Redirect URIs**, then **Save changes**.

   > It must match exactly, character for character. Copying it from the app
   > rather than typing it is the point of that button.

5. Return to your app's Settings and click **Connect**. Approve the permission
   prompt from Facebook.
6. Go to the **Pages** screen, click **Refresh from Facebook**, and click
   **Set as default** on the Page you want to post to.

Done. Generate a post and click **Publish now** to confirm it reaches your Page.

---

## Step 5 — Better AI copy (optional, still free)

Without an AI key the app falls back to template copy — and tells you so on the
Generate screen rather than passing it off as AI writing. The keyless service it
used to rely on now rejects anonymous traffic.

To restore real generation, get a free key from either provider and add it as an
environment variable in Vercel:

| Variable | Get one at |
| --- | --- |
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

Redeploy afterwards — Vercel only applies environment variables to new
deployments.

Image generation needs no key and already works.

---

## Step 6 — Autopilot

On the Settings screen, set your posts per day, allowed posting hours and
timezone, then turn **Autopilot** on. It will invent a topic, write the post,
generate the image, and publish — with nobody clicking anything.

`vercel.json` schedules one run per day at 04:00 UTC, because Vercel's Hobby plan
allows exactly one daily cron. To fire your other posting slots:

1. Add a `CRON_SECRET` environment variable in Vercel (any random string) and
   redeploy.
2. Sign up at a free scheduler such as [cron-job.org](https://cron-job.org).
3. Point it at `https://your-app.vercel.app/api/cron/process-queue` every hour,
   with the header `Authorization: Bearer YOUR_CRON_SECRET`.

Every guard is idempotent, so calling it more often than your cadence is safe — it
simply does nothing outside your posting hours or once the daily quota is met.

---

## Troubleshooting

**"Add your Meta App ID and App Secret in Settings first"**
The credentials are not saved yet, or one of them is blank. Re-paste both.

**Facebook shows an error page instead of a permission prompt**
The redirect URI in your Meta app does not match. Copy it again from the Settings
screen — a trailing slash or `http` instead of `https` is enough to break it.

**The Pages screen is empty after connecting**
Only Pages where you can create content are listed. Confirm you are an admin of
the Page, then click **Refresh from Facebook**.

**Deployment builds fine, then fails with no error message**
You changed `vercel.json` to run the cron more than once a day. Hobby plans reject
that *after* the build succeeds, and the real message never reaches the build log.
Put the schedule back to once daily.

**Copy looks generic and mentions a template**
Every AI provider was unreachable. Add a `GROQ_API_KEY` (step 5). The app is
telling you the truth rather than pretending.

**Posts publish but the image is a collage of thumbnails**
Use a more specific topic. Listicle-shaped phrasing ("10 ideas for…") pushes image
models toward grids.

---

## What it costs

Nothing. Supabase, Vercel, Meta's developer platform, Groq and the image generator
all have free tiers this app stays inside. There is no paid dependency anywhere in
the pipeline.
