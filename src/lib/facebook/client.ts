import { supabaseAdmin } from "@/lib/supabase/server";
import { GRAPH_BASE } from "@/lib/facebook/oauth";
import type { AppSettings } from "@/lib/types";

export class FacebookNotConnectedError extends Error {
  constructor() {
    super("Facebook is not connected. Connect it from Settings first.");
  }
}

export class NoPageSelectedError extends Error {
  constructor() {
    super("No Facebook Page selected. Choose one on the Pages screen first.");
  }
}

async function loadSettings(): Promise<AppSettings> {
  const db = supabaseAdmin();
  const { data } = await db.from("app_settings").select("*").eq("id", 1).single<AppSettings>();
  if (!data) throw new Error("Settings row is missing.");
  return data;
}

async function graph(path: string, params: Record<string, string>, init?: RequestInit) {
  const url = `${GRAPH_BASE}${path}`;
  const res = await fetch(init?.method === "POST" ? url : `${url}?${new URLSearchParams(params)}`, {
    ...init,
    ...(init?.method === "POST"
      ? {
          headers: { "Content-Type": "application/x-www-form-urlencoded", ...init?.headers },
          body: new URLSearchParams(params),
        }
      : {}),
    signal: AbortSignal.timeout(30_000),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || body?.error) {
    throw new Error(body?.error?.message ?? `Facebook API ${path} failed (${res.status})`);
  }
  return body;
}

export interface FacebookPage {
  id: string;
  name: string;
  category: string | null;
  /** Non-expiring when minted from a long-lived user token. */
  access_token: string;
}

/**
 * Every Page this person can create content on. `tasks` is filtered rather
 * than trusted wholesale: being able to see a Page does not mean being allowed
 * to publish to it, and finding that out at post time would be far worse.
 */
export async function fetchPages(): Promise<FacebookPage[]> {
  const settings = await loadSettings();
  if (!settings.facebook_user_token) throw new FacebookNotConnectedError();

  const pages: FacebookPage[] = [];
  let after: string | undefined;

  do {
    const params: Record<string, string> = {
      access_token: settings.facebook_user_token,
      fields: "id,name,category,access_token,tasks",
      limit: "100",
    };
    if (after) params.after = after;

    const data = await graph("/me/accounts", params);
    for (const p of data.data ?? []) {
      if (Array.isArray(p.tasks) && !p.tasks.includes("CREATE_CONTENT")) continue;
      pages.push({
        id: p.id,
        name: p.name,
        category: p.category ?? null,
        access_token: p.access_token,
      });
    }
    after = data.paging?.cursors?.after && data.paging?.next ? data.paging.cursors.after : undefined;
  } while (after);

  return pages;
}

export async function fetchAccount(): Promise<{ name: string }> {
  const settings = await loadSettings();
  if (!settings.facebook_user_token) throw new FacebookNotConnectedError();
  const data = await graph("/me", { access_token: settings.facebook_user_token, fields: "name" });
  return { name: data.name };
}

export interface PublishPhotoInput {
  pageId: string;
  pageToken: string;
  message: string;
  imageUrl: string;
}

/**
 * Publishes a photo post. Meta fetches the image from `url` itself, which is
 * why every generated image is re-hosted on Supabase Storage first — a
 * best-effort free provider's URL would not be a safe thing for Facebook's
 * crawler to depend on.
 */
export async function publishPhoto(input: PublishPhotoInput): Promise<{ id: string }> {
  const data = await graph(
    `/${input.pageId}/photos`,
    {
      url: input.imageUrl,
      message: input.message,
      access_token: input.pageToken,
      published: "true",
    },
    { method: "POST" }
  );
  return { id: data.post_id ?? data.id };
}
