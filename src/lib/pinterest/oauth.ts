import { env } from "@/lib/env";

/** Scopes needed: read boards, read + create pins, read the connected profile. */
export const PINTEREST_SCOPES = ["boards:read", "pins:read", "pins:write", "user_accounts:read"];

export function buildAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: env.pinterestAppId,
    redirect_uri: env.pinterestRedirectUri,
    response_type: "code",
    scope: PINTEREST_SCOPES.join(","),
    state,
  });
  return `https://www.pinterest.com/oauth/?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number; // seconds
  refresh_token_expires_in: number;
  scope: string;
}

function basicAuthHeader() {
  const raw = `${env.pinterestAppId}:${env.pinterestAppSecret}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.pinterestRedirectUri,
    }),
  });
  if (!res.ok) {
    throw new Error(`Pinterest token exchange failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Pinterest token refresh failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}
