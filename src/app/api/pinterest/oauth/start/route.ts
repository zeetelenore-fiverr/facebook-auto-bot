import { NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/pinterest/oauth";
import { OAUTH_STATE_COOKIE } from "@/lib/pinterest/oauth-state";

export async function GET() {
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
