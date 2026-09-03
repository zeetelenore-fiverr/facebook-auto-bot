import { NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/pinterest/oauth";
import { OAUTH_STATE_COOKIE } from "@/lib/pinterest/oauth-state";
import { fetchAccount } from "@/lib/pinterest/client";
import { updateSettings } from "@/lib/db/settings";
import { env } from "@/lib/env";

function redirectToSettings(status: "connected" | "error", message?: string) {
  const url = new URL("/dashboard/settings", env.siteUrl);
  url.searchParams.set("pinterest", status);
  if (message) url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
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
    const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

    await updateSettings({
      pinterest_access_token: token.access_token,
      pinterest_refresh_token: token.refresh_token,
      pinterest_token_expires_at: expiresAt,
    });

    // Best-effort: fetch the username for display; connection still succeeds without it.
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
