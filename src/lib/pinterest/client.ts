import { supabaseAdmin } from "@/lib/supabase/server";
import { refreshAccessToken } from "@/lib/pinterest/oauth";
import type { AppSettings } from "@/lib/types";

const API_BASE = "https://api.pinterest.com/v5";

export class PinterestNotConnectedError extends Error {
  constructor() {
    super("Pinterest account is not connected. Connect it from Settings first.");
  }
}

/**
 * Returns a valid access token, transparently refreshing it (and persisting
 * the new tokens) if it is within 5 minutes of expiry. Every call site that
 * hits the Pinterest API should go through this instead of reading the
 * settings row directly, so token refresh only lives in one place.
 */
async function getValidAccessToken(): Promise<string> {
  const db = supabaseAdmin();
  const { data: settings } = await db
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .single<AppSettings>();

  if (!settings?.pinterest_access_token || !settings.pinterest_refresh_token) {
    throw new PinterestNotConnectedError();
  }

  const expiresAt = settings.pinterest_token_expires_at
    ? new Date(settings.pinterest_token_expires_at).getTime()
    : 0;
  const isExpiringSoon = expiresAt - Date.now() < 5 * 60 * 1000;

  if (!isExpiringSoon) {
    return settings.pinterest_access_token;
  }

  const refreshed = await refreshAccessToken(settings.pinterest_refresh_token);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await db
    .from("app_settings")
    .update({
      pinterest_access_token: refreshed.access_token,
      // Pinterest may or may not rotate the refresh token; keep the old one if absent.
      pinterest_refresh_token: refreshed.refresh_token ?? settings.pinterest_refresh_token,
      pinterest_token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  return refreshed.access_token;
}

async function pinterestFetch(path: string, init: RequestInit = {}) {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Pinterest API ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

export interface PinterestBoard {
  id: string;
  name: string;
  privacy: string;
}

export async function fetchBoards(): Promise<PinterestBoard[]> {
  const boards: PinterestBoard[] = [];
  let bookmark: string | undefined;

  do {
    const qs = new URLSearchParams({ page_size: "100" });
    if (bookmark) qs.set("bookmark", bookmark);
    const data = await pinterestFetch(`/boards?${qs.toString()}`);
    boards.push(
      ...(data.items ?? []).map((b: { id: string; name: string; privacy: string }) => ({
        id: b.id,
        name: b.name,
        privacy: b.privacy,
      }))
    );
    bookmark = data.bookmark || undefined;
  } while (bookmark);

  return boards;
}

export async function fetchAccount(): Promise<{ username: string }> {
  const data = await pinterestFetch("/user_account");
  return { username: data.username };
}

export interface CreatePinInput {
  boardId: string;
  title: string;
  description: string;
  imageUrl: string;
  destinationUrl?: string | null;
}

export async function createPin(input: CreatePinInput): Promise<{ id: string }> {
  const data = await pinterestFetch("/pins", {
    method: "POST",
    body: JSON.stringify({
      board_id: input.boardId,
      title: input.title.slice(0, 100),
      description: input.description.slice(0, 500),
      link: input.destinationUrl || undefined,
      media_source: {
        source_type: "image_url",
        url: input.imageUrl,
      },
    }),
  });
  return { id: data.id };
}
