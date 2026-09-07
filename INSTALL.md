# Installation guide

This takes you from nothing to a bot that writes and publishes Facebook Page posts
on its own. Everything used here is free, and **you do not need to write any
code** — there is nothing to download, compile or run on your computer.

Set aside about 30 minutes the first time.

## Before you start

You need three free accounts. Create them as you go; each step says when.

| | What it is | Why |
| --- | --- | --- |
| **Supabase** | A database, free tier | Stores your posts, settings and images |
| **Vercel** | Website hosting, free tier | Runs the app at its own web address |
| **Meta for Developers** | Facebook's developer site, free | Lets the app post to your Page |

You also need a **Facebook Page** you administer. Meta stopped allowing API posts
to personal profiles in 2018, so this only works with Pages. Creating one is free
and takes two minutes from your Facebook account.

> **Tip:** keep a blank notepad open. You will copy five or six values between
> browser tabs, and having them in one place saves a lot of back and forth.

## What you will end up with

- Your own private web dashboard, protected by a password you choose
- A **Generate** screen: type a topic, get a written post plus a matching image
- A **Queue** for scheduling, and a **History** of what published
- **Autopilot**, which invents topics and posts on a schedule with nobody clicking

---

## Step 1 — Database (Supabase)

*About 5 minutes.*

1. Go to [supabase.com](https://supabase.com) and click **Start your project**.
   Sign in with GitHub or an email address.

2. Click **New project**.

   - **Name:** anything, for example `facebook-auto-bot`
   - **Database password:** click Generate, then save it somewhere. You will not
     need it for this app, but it cannot be recovered later.
   - **Region:** pick the one closest to you
   - **Plan:** Free

   Click **Create new project** and wait about a minute while it provisions.

3. When it is ready, click **SQL Editor** in the left sidebar, then **New query**.

4. Open [`supabase/schema.sql`](supabase/schema.sql) from this repository. Select
   everything (Ctrl+A), copy it, paste it into the editor, and click **Run**.

   You should see **Success. No rows returned.** That is correct — it created
   empty tables.

   > The last few lines also create a storage bucket called `post-images`, where
   > every generated image is kept. If that part errors, create it by hand:
   > **Storage** in the left sidebar → **New bucket** → name it exactly
   > `post-images` → turn **Public bucket** on → Save. Images will not load
   > without the public setting.

5. Click the gear icon (**Project Settings**) in the left sidebar, then **API**.
   Copy two values into your notepad:

   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **`service_role` key** — under *Project API keys*. Click **Reveal** on the
     `service_role` row, not the `anon` one.

> **About that key.** The `service_role` key can read and write your whole
> database. It is only ever used by the app's own server, never sent to a browser.
> Do not post it anywhere public or paste it into a chat.

---

## Step 2 — Put it online (Vercel)

*About 5 minutes.*

1. Go to [github.com](https://github.com) and, on this repository's page, click
   **Fork** (top right). This makes your own copy. Vercel can only deploy
   repositories on your own account.

2. Go to [vercel.com](https://vercel.com) and sign in **with GitHub**.

3. Click **Add New → Project**. Find your forked repository in the list and click
   **Import**.

4. **Before clicking Deploy**, expand **Environment Variables** and add these four.
   Add each one as a separate Name/Value pair:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | The Project URL from step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | The `service_role` key from step 1 |
   | `ADMIN_PASSWORD` | A password you choose — this opens your dashboard |
   | `SESSION_SECRET` | A long random string (see below) |

   For `SESSION_SECRET`, nobody ever types this — it just has to be long and
   random. Press **F12** on any web page to open the console, paste this, and press
   Enter, then copy the result:

   ```js
   crypto.randomUUID() + crypto.randomUUID()
   ```

5. Click **Deploy** and wait two or three minutes.

6. When it finishes, Vercel shows your app's address, something like
   `https://your-app.vercel.app`. Open it, sign in with the `ADMIN_PASSWORD` you
   chose, and you should see the dashboard.

   **Save that address in your notepad.** Several later steps need it, and it must
   match exactly.

At this point the app already works apart from posting to Facebook. Try
**Generate** — you will get a written post and an image. Only **Publish** is not
available yet.

---

## Step 3 — Meta app

This is the longest step. Nothing here is difficult, but Meta's dashboard renames
things often, so follow the order rather than hunting for screens that match a
screenshot.

Posting to a Page **you administer** uses Standard Access, which every Meta app is
[approved for automatically](https://developers.facebook.com/docs/graph-api/overview/access-levels/).
No App Review, no demo video and no business verification are needed to get this
working.

> **Read this before you start.** While your Meta app is in **Development** mode,
> the posts it creates are
> [visible only to people with a role on the app](https://developers.facebook.com/docs/development/build-and-test/app-modes)
> — that means you. They are real Page posts, not drafts, and they become visible
> to everyone the moment the app is switched to **Live**, including ones published
> earlier. Switching to Live requires App Review. Step 7 covers that.

### 3.1 Create the app

Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and
click **Create app**. If you have never used it before, Meta asks you to register
as a developer first — free, instant, a couple of clicks.

Enter an **app name** (anything — "AutoBot" is fine) and your contact email.

### 3.2 Choose the use case — the step that decides everything

You will see a list of use cases. Pick:

> ### Manage everything on your Page

**Do not pick "Authenticate and request data from users with Facebook Login."**
Meta treats that one as *incompatible* with Page management. If you choose it you
cannot request the posting permission later, and the only fix is to delete the app
and start over.

Pick that one use case and nothing else.

### 3.3 Business portfolio — skip it

Meta asks you to connect a "business portfolio". Choose
**"I don't want to connect a business portfolio yet."**

A portfolio is only required when an app touches data you do not own. Posting to
your own Page is not that, and you can connect one later if you ever need to.

If you would rather create one anyway, it is free and needs no registered company:
open [business.facebook.com](https://business.facebook.com), use the dropdown at
the top of the left menu, choose **Create a business portfolio**, and give it your
own name and an email you can open right now.

> **You never need Business Verification.** Meta offers it and asks for a tax ID
> and legal documents. That is for serving *other people's* accounts.

### 3.4 Add the two posting permissions

Your app now has `public_profile`, `pages_show_list` and `business_management`.
Two more are needed. Open:

```
https://developers.facebook.com/apps/YOUR-APP-ID/use_cases/
```

Click **Customize** on *Manage everything on your Page*, find the **Permissions**
list, and click **Add** next to:

- **`pages_manage_posts`** — lets the app create the post
- **`pages_read_engagement`** — lets it read the Page it posts to

You should end up seeing all five permissions. Skip this and everything still
connects, then publishing fails with a bare *"(#200) Permissions error"*.

> Replace `YOUR-APP-ID` with your App ID. Once you have saved your credentials in
> the app, its Settings screen prints these links with the ID already filled in.

### 3.5 Copy the App ID and App Secret

Open **App settings → Basic**:

```
https://developers.facebook.com/apps/YOUR-APP-ID/settings/basic/
```

Copy the **App ID**, then click **Show** next to **App Secret** and copy that too.
Keep them handy — they go into your app in step 4.

### 3.6 Fill in App Domains and add a Website

Still on that Basic settings page:

**App domains** — paste the hostname of your deployment. **Hostname only:**

```
your-app.vercel.app
```

Not `https://your-app.vercel.app`. The field accepts the `https://` version
without complaining and then silently fails every check, which looks exactly like
having left it blank. Your app's Settings screen shows the correct value with a
copy button — use that.

**Privacy policy URL** — must start with `https://`. Your own deployment URL is
fine for now:

```
https://your-app.vercel.app/
```

An `http://` value can stop the whole page from saving, quietly losing your other
edits.

**Website platform** — scroll to the bottom, click **+ Add Platform**, choose
**Website**, and set the Site URL to:

```
https://your-app.vercel.app/
```

App Domains on its own is often not enough; Meta validates it against a platform.

Click **Save changes**, then reload the page and confirm your values survived. If
they reverted, something on the page was rejected — usually the privacy policy URL.

> The **Advanced** settings page has an "Authorize callback URL" field. Leave it
> empty, and leave "Native or desktop app?" off. That field is for desktop login
> flows, and turning the toggle on tells Facebook your app cannot keep a secret,
> which breaks the sign-in this app uses.

### 3.7 Add the redirect URI

Open the login settings:

```
https://developers.facebook.com/apps/YOUR-APP-ID/fb-login/settings/
```

In the left menu this is **Facebook Login → Settings** or **Facebook Login for
Business → Settings** — the same screen either way.

Paste this into **Valid OAuth Redirect URIs** (your app's Settings screen has it
with a copy button):

```
https://your-app.vercel.app/api/facebook/oauth/callback
```

Then scroll down and click **Save changes**.

> **Save before you validate.** Typing the URI turns it into a chip immediately,
> but the **Check URI** button only reads the *saved* list — so it calls your URI
> invalid while it is sitting right there on screen. Save first, then check. After
> saving, **Check URI** should say *"This is a valid redirect URI."*

Leave the other switches alone. Client OAuth login, Web OAuth login, Enforce HTTPS
and Use Strict Mode should all stay **Yes**.

### 3.8 Leave the app in Development mode

Do not switch it to Live yet — that needs App Review, and everything works without
it. Step 7 covers going public when you are ready.

---

## Step 4 — Connect the two

1. Open your deployed app and go to **Settings**.

2. In the **Meta app** card, fill in:

   - **App ID** — from step 3.5
   - **App Secret** — from step 3.5
   - **Login configuration ID** — **leave this empty**

   Click **Save credentials**.

   > **Why empty?** Apps on this use case get *Facebook Login for Business*, where
   > a saved "login configuration" replaces the permission list. In practice those
   > configurations often cannot be given `pages_manage_posts` at all — the option
   > is simply not offered — and you connect successfully with permissions
   > missing. Leaving this blank makes the app request the three permissions
   > directly, which works. Fill it in only if you have a configuration you know
   > includes all three.

3. Check that the **App Domain** and **Redirect URI** shown on that card match what
   you entered in steps 3.6 and 3.7. They are generated from the address you are
   on, so if they differ, you are on a different URL than you configured — see the
   note at the end of this step.

4. Click **Connect**. Facebook shows a permission prompt.

   **Do not untick anything.** Make sure your Page is selected and accept all the
   permissions. Unticking one here has the same effect as never adding it.

5. You should land back on Settings with **"Facebook account connected."**

   If you instead get a message naming missing permissions, go back to step 3.4,
   then **Disconnect** and **Connect** again. A token keeps whatever permissions it
   was issued with; changing the app afterwards does not upgrade it.

6. Go to the **Pages** screen, click **Refresh from Facebook**, and click **Set as
   default** next to your Page.

Now open **Generate**, type a topic, click **Generate**, then **Publish now**. A
**View post** link appears — click it to see the post on your Page.

> ### If your deployment answers on more than one address
>
> Vercel usually gives a project two hostnames. Facebook checks the one you were
> actually on when you clicked Connect — not the one you configured. Pick one and
> use it everywhere: App Domains, the Website platform's Site URL, the redirect
> URI, and the address you open. Mixing two of them is the most common reason
> everything looks configured and still fails.

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

*Optional. About 5 minutes.*

On the **Settings** screen:

1. Set **Posts per day** — start with 1 or 2 while you see what it writes.
2. Set your **Timezone**, so posting hours mean what you expect.
3. Click the hours you allow it to post in. The blue ones are on.
4. Turn the **Autopilot** switch on.

From then on it picks a topic, writes the post, generates the image and publishes
it, with nobody clicking anything.

### Posting more than once a day

Vercel's free plan allows exactly **one** scheduled run per day, and this app is
set to 04:00 UTC. If you want two or three posts a day, a free external scheduler
can trigger the same thing hourly:

1. In Vercel, open your project → **Settings → Environment Variables**, add
   `CRON_SECRET` with any random string as its value, and save. Then go to
   **Deployments**, open the newest one, and choose **Redeploy** — Vercel only
   applies new variables to new deployments.

2. Sign up free at [cron-job.org](https://cron-job.org) and create a job:

   - **URL:** `https://your-app.vercel.app/api/cron/process-queue`
   - **Schedule:** every hour
   - **Advanced → Headers:** add `Authorization` with the value
     `Bearer YOUR_CRON_SECRET`

Calling it every hour is safe. It checks the time against your allowed hours and
your daily limit and does nothing if it is not due — so a few extra calls cost
nothing.

> Without `CRON_SECRET` set, this endpoint refuses anonymous calls, so your
> scheduler will get a 401. That is deliberate: an unprotected publishing endpoint
> would let anyone post to your Page.

---

## Step 7 — Going public (App Review)

Everything above works while your app is in Development mode, but the posts are
only visible to you. To let the world see them, the app has to be switched to
**Live**, and that needs App Review for `pages_manage_posts`.

You are in a good position to apply, because reviewers want to see a working
integration and you now have one.

Before you apply, publish at least one post successfully. Meta's *Testing your use
cases* screen tracks "1 API call required" per permission, and a real publish
ticks it off.

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

## What it costs

Nothing. Supabase, Vercel, Meta's developer platform, Groq and the image generator
all have free tiers this app stays inside. There is no paid dependency anywhere in
the pipeline.
