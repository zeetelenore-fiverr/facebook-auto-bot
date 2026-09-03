import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { generateContent } from "@/lib/ai/text";
import { generateImage } from "@/lib/ai/image";
import { getTrendingTopics } from "@/lib/trends";
import { createPinRecord, deletePinRecord, getPin, listDuePins, listPins, updatePinRecord } from "@/lib/db/pins";
import { getSettings, updateSettings } from "@/lib/db/settings";
import { fetchAccount, fetchBoards, PinterestNotConnectedError } from "@/lib/pinterest/client";
import { buildAuthorizeUrl, exchangeCodeForToken } from "@/lib/pinterest/oauth";
import { OAUTH_STATE_COOKIE } from "@/lib/pinterest/oauth-state";
import { publishPinNow } from "@/lib/pinterest/publish";
import { maybeRunAutopilot } from "@/lib/autopilot";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { PinStatus } from "@/lib/types";

/**
 * Every API endpoint lives in this one catch-all handler on purpose.
 *
 * Next.js turns each `route.ts` into its own serverless function, and this
 * app's 15 endpoints put the deployment over Vercel's per-deployment
 * function limit on the Hobby plan — the build succeeded every time and
 * then died at "Deploying outputs" with no log line explaining why.
 * Collapsing them into one dispatcher takes the deployment from ~16
 * functions to 2. The endpoint URLs and behaviour are unchanged; only the
 * file layout moved, and all real logic still lives in `src/lib/*`.
 */

export const maxDuration = 60;

type Ctx = { params: Promise<{ path: string[] }> };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

function notFound() {
  return json({ error: "Not found." }, 404);
}

async function safely(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Unexpected server error." }, 500);
  }
}

/* ------------------------------------------------------------------ GET */

export async function GET(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const route = path.join("/");
  const url = new URL(req.url);

  return safely(async () => {
    if (route === "trends") {
      return json(await getTrendingTopics());
    }

    if (route === "settings") {
      const settings = await getSettings();
      const { pinterest_access_token, pinterest_refresh_token, ...safe } = settings;
      void pinterest_access_token;
      void pinterest_refresh_token;
      return json({ ...safe, pinterest_connected: Boolean(settings.pinterest_access_token) });
    }

    if (route === "pins") {
      const status = url.searchParams.get("status");
      const pins = await listPins({ status: status ? (status.split(",") as PinStatus[]) : undefined });
      return json({ pins });
    }

    if (route === "pinterest/boards") {
      return getBoards(url.searchParams.get("refresh") === "1");
    }

    if (route === "pinterest/oauth/start") {
      const state = crypto.randomUUID();
      const res = NextResponse.redirect(buildAuthorizeUrl(state));
      res.cookies.set(OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      });
      return res;
    }

    if (route === "pinterest/oauth/callback") {
      return oauthCallback(req, url);
    }

    if (route === "cron/process-queue") {
      return runCron(req, url);
    }

    return notFound();
  });
}

/* ----------------------------------------------------------------- POST */

const LoginBody = z.object({ password: z.string() });

const ContentBody = z.object({ topic: z.string().trim().min(2).max(200) });

const ImageBody = z.object({
  prompt: z.string().trim().min(2).max(300),
  source: z.enum(["ai", "stock", "mixed"]),
});

const CreatePinBody = z.object({
  topic: z.string().min(1).max(200),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  hashtags: z.array(z.string()).max(15).default([]),
  imageUrl: z.string().url(),
  imageSource: z.enum(["ai", "stock"]),
  destinationUrl: z.string().url().optional().or(z.literal("")),
  boardId: z.string().min(1),
  boardName: z.string().min(1),
  action: z.enum(["draft", "schedule", "post_now"]),
  scheduledAt: z.string().datetime().optional(),
});

const DefaultBoardBody = z.object({ boardId: z.string().min(1), boardName: z.string().min(1) });

export async function POST(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const route = path.join("/");

  return safely(async () => {
    if (route === "auth/login") {
      const parsed = LoginBody.safeParse(await req.json().catch(() => null));
      if (!parsed.success || parsed.data.password !== env.adminPassword) {
        return json({ error: "Incorrect password." }, 401);
      }
      const res = json({ ok: true });
      res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
      return res;
    }

    if (route === "auth/logout") {
      const res = json({ ok: true });
      res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
      return res;
    }

    if (route === "generate/content") {
      const parsed = ContentBody.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return json({ error: "A topic (2-200 characters) is required." }, 400);
      return json(await generateContent(parsed.data.topic));
    }

    if (route === "generate/image") {
      const parsed = ImageBody.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return json({ error: "A prompt and image source are required." }, 400);
      try {
        return json(await generateImage(parsed.data.prompt, parsed.data.source));
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : "Image generation failed." }, 502);
      }
    }

    if (route === "pins") {
      const parsed = CreatePinBody.safeParse(await req.json().catch(() => null));
      if (!parsed.success) {
        return json({ error: parsed.error.issues[0]?.message ?? "Invalid pin." }, 400);
      }
      const b = parsed.data;
      if (b.action === "schedule" && !b.scheduledAt) {
        return json({ error: "scheduledAt is required to schedule a pin." }, 400);
      }

      const pin = await createPinRecord({
        topic: b.topic,
        title: b.title,
        description: b.description,
        hashtags: b.hashtags,
        image_url: b.imageUrl,
        image_source: b.imageSource,
        destination_url: b.destinationUrl || null,
        board_id: b.boardId,
        board_name: b.boardName,
        scheduled_at: b.action === "schedule" ? b.scheduledAt! : null,
        status: b.action === "schedule" ? "scheduled" : "draft",
      });

      if (b.action === "post_now") {
        return json({ pin: await publishPinNow(pin.id) });
      }
      return json({ pin });
    }

    // pins/<id>/post-now
    if (path.length === 3 && path[0] === "pins" && path[2] === "post-now") {
      try {
        return json({ pin: await publishPinNow(path[1]) });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : "Failed to post pin." }, 502);
      }
    }

    if (route === "pinterest/default-board") {
      const parsed = DefaultBoardBody.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return json({ error: "boardId and boardName are required." }, 400);
      await updateSettings({
        default_board_id: parsed.data.boardId,
        default_board_name: parsed.data.boardName,
      });
      return json({ ok: true });
    }

    if (route === "pinterest/disconnect") {
      await updateSettings({
        pinterest_access_token: null,
        pinterest_refresh_token: null,
        pinterest_token_expires_at: null,
        pinterest_username: null,
        default_board_id: null,
        default_board_name: null,
      });
      await supabaseAdmin().from("boards_cache").delete().neq("board_id", "");
      return json({ ok: true });
    }

    return notFound();
  });
}

/* ---------------------------------------------------------------- PATCH */

const SettingsBody = z.object({
  image_source: z.enum(["ai", "stock", "mixed"]).optional(),
  utm_suffix: z.string().max(200).optional(),
  auto_post_enabled: z.boolean().optional(),
  posts_per_day: z.number().int().min(1).max(20).optional(),
  posting_hours: z.array(z.number().int().min(0).max(23)).min(1).max(24).optional(),
  timezone: z.string().min(1).max(64).optional(),
});

const UpdatePinBody = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  hashtags: z.array(z.string()).max(15).optional(),
  destinationUrl: z.string().url().optional().or(z.literal("")),
  boardId: z.string().min(1).optional(),
  boardName: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  status: z.enum(["draft", "scheduled"]).optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const route = path.join("/");

  return safely(async () => {
    if (route === "settings") {
      const parsed = SettingsBody.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return json({ error: "Invalid settings payload." }, 400);
      const updated = await updateSettings(parsed.data);
      const { pinterest_access_token, pinterest_refresh_token, ...safe } = updated;
      void pinterest_access_token;
      void pinterest_refresh_token;
      return json(safe);
    }

    // pins/<id>
    if (path.length === 2 && path[0] === "pins") {
      const id = path[1];
      const existing = await getPin(id);
      if (!existing) return json({ error: "Pin not found." }, 404);
      if (existing.status === "posted") {
        return json({ error: "A posted pin can no longer be edited." }, 409);
      }

      const parsed = UpdatePinBody.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return json({ error: "Invalid update payload." }, 400);
      const b = parsed.data;

      const updated = await updatePinRecord(id, {
        ...(b.title !== undefined && { title: b.title }),
        ...(b.description !== undefined && { description: b.description }),
        ...(b.hashtags !== undefined && { hashtags: b.hashtags }),
        ...(b.destinationUrl !== undefined && { destination_url: b.destinationUrl || null }),
        ...(b.boardId !== undefined && { board_id: b.boardId }),
        ...(b.boardName !== undefined && { board_name: b.boardName }),
        ...(b.scheduledAt !== undefined && { scheduled_at: b.scheduledAt }),
        ...(b.status !== undefined && { status: b.status }),
      });

      return json({ pin: updated });
    }

    return notFound();
  });
}

/* --------------------------------------------------------------- DELETE */

export async function DELETE(_req: Request, ctx: Ctx) {
  const { path } = await ctx.params;

  return safely(async () => {
    if (path.length === 2 && path[0] === "pins") {
      await deletePinRecord(path[1]);
      return json({ ok: true });
    }
    return notFound();
  });
}

/* ------------------------------------------------------------- handlers */

async function getBoards(refresh: boolean) {
  const db = supabaseAdmin();
  try {
    if (refresh) {
      const boards = await fetchBoards();
      if (boards.length > 0) {
        await db.from("boards_cache").delete().neq("board_id", "");
        await db
          .from("boards_cache")
          .insert(boards.map((b) => ({ board_id: b.id, name: b.name, privacy: b.privacy })));
      }
    }

    const { data: cached } = await db.from("boards_cache").select("*").order("name");
    const settings = await getSettings();
    return json({ boards: cached ?? [], defaultBoardId: settings.default_board_id });
  } catch (err) {
    if (err instanceof PinterestNotConnectedError) return json({ error: err.message }, 409);
    return json({ error: err instanceof Error ? err.message : "Failed to load boards." }, 502);
  }
}

function redirectToSettings(status: "connected" | "error", message?: string) {
  const target = new URL("/dashboard/settings", env.siteUrl);
  target.searchParams.set("pinterest", status);
  if (message) target.searchParams.set("message", message);
  return NextResponse.redirect(target);
}

async function oauthCallback(req: Request, url: URL) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${OAUTH_STATE_COOKIE}=`))
    ?.split("=")[1];

  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectToSettings("error", "Login was cancelled or the request expired. Please try again.");
  }

  try {
    const token = await exchangeCodeForToken(code);
    await updateSettings({
      pinterest_access_token: token.access_token,
      pinterest_refresh_token: token.refresh_token,
      pinterest_token_expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    });

    // Best-effort: the connection still counts as successful without a username.
    try {
      const account = await fetchAccount();
      await updateSettings({ pinterest_username: account.username });
    } catch {}

    const res = redirectToSettings("connected");
    res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    return redirectToSettings("error", err instanceof Error ? err.message : "Connection failed.");
  }
}

async function runCron(req: Request, url: URL) {
  if (env.cronSecret) {
    const auth = req.headers.get("authorization");
    const provided = url.searchParams.get("secret");
    if (auth !== `Bearer ${env.cronSecret}` && provided !== env.cronSecret) {
      return json({ error: "Unauthorized" }, 401);
    }
  }

  const due = await listDuePins(new Date().toISOString());
  const queueResults = [];
  for (const pin of due) {
    const result = await publishPinNow(pin.id);
    queueResults.push({ id: result.id, status: result.status });
  }

  return json({
    processedFromQueue: queueResults.length,
    queueResults,
    autopilot: await maybeRunAutopilot(),
  });
}
