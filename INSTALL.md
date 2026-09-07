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

Posting to a Page **you administer** uses Standard Access, which every Meta app is
[approved for automatically](https://developers.facebook.com/docs/graph-api/overview/access-levels/).
No App Review, no demo video and no business verification are needed to get the
whole thing working.

> **Read this before you start.** While your Meta app is in **Development** mode,
> the posts it creates are
> [visible only to people with a role on the app](https://developers.facebook.com/docs/development/build-and-test/app-modes)
> — that means you. They are real Page posts, not drafts, and they become visible
> to everyone the moment the app is switched to **Live**, including ones published
> earlier. Switching to Live requires App Review for `pages_manage_posts`.
>
> Set everything up first and confirm it works. Step 7 covers going public.

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and
   click **Create app**. You may be asked to register as a developer first — it is
   free and instant.

2. Enter an **app name** (anything) and your contact email.

3. **Use case — this is the step that matters.** Select:

   > ### ✅ Manage everything on your Page

   Do **not** select *"Authenticate and request data from users with Facebook
   Login"*. Meta treats that use case as **incompatible** with Page management, and
   if you pick it you will not be able to request the posting permissions
   afterwards — you would have to start a new app.

   Select only that one use case. You can add others later if you ever need them.

4. **Business portfolio — you can skip this.** The flow asks you to connect one,
   and offers **"I don't want to connect a business portfolio yet"**. Take it.

   Meta only requires a portfolio when your app accesses *data you don't own or
   manage*. Posting to your own Page is not that, and a portfolio can be connected
   at any time later if you ever need one.

   If you do want or need one — for instance if the **Configurations** screen in
   step 6 refuses to create a login configuration without it — it is free, takes
   two minutes, and **does not require a registered company**:

   - Open [business.facebook.com](https://business.facebook.com), click the
     dropdown at the top of the left menu, and choose **Create a business
     portfolio** at the bottom.
   - Fill in a **business name** (your own name is fine), **your name**, and a
     **business email** you can open right now.
   - Confirm the email Meta sends. The portfolio exists immediately.
   - If it offers to add Pages or Instagram accounts, click **Skip** — this app
     asks for Page access later through the login flow.

   > **You never need Business Verification.** Meta will offer it, and it asks for
   > a tax ID and legal documents. That is for Advanced Access — serving other
   > people's accounts. Posting to your own Page never triggers it.

5. **Add the posting permissions.** The use case gives you `public_profile`,
   `pages_show_list` and `business_management` by default. You need two more.

   Go to your app's use cases — from the left menu, or straight there:

   ```
   https://developers.facebook.com/apps/YOUR-APP-ID/use_cases/
   ```

   Open **Manage everything on your Page → Customize**, find the **Permissions**
   list, and click **Add** on:

   - `pages_manage_posts` — create the post
   - `pages_read_engagement` — read the Page it posts to

   These sit at Standard Access, so they work on your own Pages with no review.

   > Replace `YOUR-APP-ID` with the App ID from step 7. Once you have saved your
   > credentials in the app, its Settings screen prints these links for you with
   > the ID already filled in.

6. **Create a login configuration.** Apps built on this use case use *Facebook
   Login for Business*, where a saved configuration replaces the permission list
   in the login URL.

   Go to **Facebook Login for Business → Configurations** in the left menu, or:

   ```
   https://developers.facebook.com/apps/YOUR-APP-ID/fb-login/configurations/
   ```

   Then **Create configuration**:

   - Give it any name
   - **Token type:** User access token
   - **Assets:** Pages
   - **Permissions:** tick `pages_show_list`, `pages_manage_posts`,
     `pages_read_engagement`
   - Save, then copy the **Configuration ID** (a long number)

7. Open **App settings → Basic** and copy the **App ID** and **App Secret**
   (click *Show*):

   ```
   https://developers.facebook.com/apps/  →  your app  →  App settings > Basic
   ```

8. **Fill in App Domains**, on that same Basic settings page:

   ```
   https://developers.facebook.com/apps/YOUR-APP-ID/settings/basic/
   ```

   Your app's Settings screen shows the exact value to paste (the *App Domain*
   field). It is just the hostname — no `https://`, no trailing slash:

   ```
   your-app.vercel.app
   ```

   Skip this and Facebook refuses the login with *"Can't load URL: The domain of
   this URL isn't included in the app's domains."* Click **Save changes**.

   **Then, on the same page, scroll to the bottom and click
   `+ Add Platform` → `Website`**, and set the Site URL to:

   ```
   https://your-app.vercel.app/
   ```

   App Domains on its own is often not enough — Meta validates it against a
   platform, and without the Website platform you get the same "Can't load URL"
   error even with the domain filled in. **Save changes** again.

   > If your deployment answers on more than one hostname — Vercel gives most
   > projects two — add **every** hostname you might open the app on to App
   > Domains, and add each one's callback URL in step 4 of the next section.
   > Facebook checks the host you actually launched the login from.

9. Leave the app in **Development** mode. That is all Standard Access needs;
   switching to Live would demand a privacy policy you do not need yet.

---

## Step 4 — Connect the two

1. In your deployed app, go to **Settings**.

2. In the **Meta app** card, fill in:

   - **App ID** — from step 3.7
   - **App Secret** — from step 3.7
   - **Login configuration ID** — from step 3.6

   Then click **Save credentials**. No redeploy is needed.

   > If your Meta app uses classic Facebook Login rather than Login for Business,
   > leave the configuration ID blank — the app will send the permission list
   > directly instead.

3. Still on that card, copy the **Redirect URI** with the Copy button. It looks
   like:

   ```
   https://your-app.vercel.app/api/facebook/oauth/callback
   ```

4. Back in your Meta app, open the login product's **Settings** screen:

   ```
   https://developers.facebook.com/apps/YOUR-APP-ID/fb-login/settings/
   ```

   In the left menu this is **Facebook Login → Settings**, or **Facebook Login for
   Business → Settings** depending on your app — the same screen either way.

   Paste the URI into **Valid OAuth Redirect URIs**, then scroll to the bottom
   and click **Save changes**.

   > **Save before you validate.** Typing the URI turns it into a chip, but the
   > **Check URI** validator only reads the *saved* list — so it reports
   > *"This is an invalid redirect URI for this application"* about a URI that is
   > sitting right there on screen. Save first, then check.

   > It must match exactly, character for character. Copying it from the app
   > rather than typing it is the whole point of that button.

5. Return to your app's Settings and click **Connect**. Approve the prompt from
   Facebook and choose the Page you want to grant access to.

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

**Do I need a business portfolio?**
No, for this app. Meta requires one only when your app accesses data you do not
own or manage — posting to your own Page is not that. Skip it during app creation
and connect one later if you ever need to. The one place it can bite is the
Facebook Login for Business **Configurations** screen; if that refuses to save
without a portfolio, create one (step 3.4) and come back.

**"This is an invalid redirect URI for this application" — but I can see it listed**
The chip is entered, not saved. Scroll to the bottom of the page, click **Save
changes**, then run **Check URI** again. The validator only reads the saved list.

**What goes in "Authorize callback URL" on the Advanced settings page?**
Nothing — leave it empty. That field belongs to the **"Native or desktop app?"**
toggle above it and is only used by native and desktop login flows. A web app
uses **Valid OAuth Redirect URIs** instead. Leave the toggle off too: turning it
on tells Facebook your app cannot keep a secret, which breaks the server-side
token exchange this app relies on.

While you are on that page, leave **Upgrade API version** at **v26.0** — that is
the version this app is built against.

**I published a post but nobody else can see it**
Expected, and not a bug. While the Meta app is in **Development** mode its posts
are visible only to people with a role on the app. Switching to **Live** makes
them public — including the ones already published — and that needs App Review
for `pages_manage_posts`. See step 7.

**Meta asks me to verify my business**
You can ignore it. Business Verification is required for Advanced Access, which
means acting on Pages belonging to people who have no role on your app. Posting to
your own Page uses Standard Access and never needs it.

**"Can't load URL: The domain of this URL isn't included in the app's domains"**
Work through these in order:

1. **App Domains** must contain the hostname, in **App settings → Basic** —
   **hostname only**. `https://pinterest-auto-bot.vercel.app` never matches;
   `pinterest-auto-bot.vercel.app` does. The field accepts the scheme without
   complaining and then silently fails every check. Copy the value from your
   app's Settings screen instead of typing it. Confirm you clicked **Save
   changes**; the value can look entered and still be unsaved.
2. **A Website platform must exist** on that same page (`+ Add Platform →
   Website`) with your site's URL. App Domains alone frequently is not enough.
3. **Check which hostname you are actually on.** If your deployment answers on
   several URLs, Facebook checks the one in your address bar when you clicked
   Connect — not the one you configured. Pick one hostname and make all four
   agree: App Domains, the Website platform's Site URL, the Valid OAuth Redirect
   URI, and the URL you actually open. Mixing two of them is the most common way
   this fails after everything looks configured.
4. **Privacy policy URL must be `https://`.** An `http://` value can block the
   settings page from saving, which silently loses your other edits.

**Facebook shows an error page instead of a permission prompt**
Usually the redirect URI does not match. Copy it again from the Settings screen —
a trailing slash or `http` instead of `https` is enough to break it. If the error
mentions an invalid or missing configuration, your app uses Facebook Login for
Business and the **Login configuration ID** is wrong or blank.

**"Invalid Scopes" or the prompt asks for nothing useful**
Your app uses Facebook Login for Business, which ignores the permission list and
reads a saved configuration instead. Create one (step 3.6) and paste its ID into
Settings.

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

## Step 7 — Going public (App Review)

Everything above works while your app is in Development mode, but the posts are
only visible to you. To let the world see them, the app has to be switched to
**Live**, and that needs App Review for `pages_manage_posts`.

You are in a good position to apply, because reviewers want to see a working
integration and you now have one.

1. In **App settings → Basic**, make sure these are filled in and reachable:
   - **Privacy policy URL** — must be `https://`
   - **Terms of Service URL**
   - **App icon** and **Category**
2. Go to your app's **App Review → Permissions and features**, find
   `pages_manage_posts`, and click **Request advanced access**.
3. Meta asks how the permission is used and for a **screencast**. Record yourself:
   signing in to your deployment, opening Settings, clicking **Connect**,
   approving the Facebook prompt, choosing a Page, generating a post, and clicking
   **Publish now** — then show the post on the Page. That is the whole story they
   are checking.
4. Submit and wait. Reviews usually take a few business days.
5. Once approved, flip the app from **Development** to **Live** at the top of the
   dashboard. Existing posts become publicly visible too.

Until then everything still runs — the autopilot posts on schedule, the queue
works, the history fills up. Only the audience is limited to you.

---

## What it costs

Nothing. Supabase, Vercel, Meta's developer platform, Groq and the image generator
all have free tiers this app stays inside. There is no paid dependency anywhere in
the pipeline.
