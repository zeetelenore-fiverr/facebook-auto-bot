import type { FacebookCredentials } from "@/lib/facebook/credentials";

/** Graph API version this app is pinned to. Meta supports each for ~2 years. */
export const GRAPH_VERSION = "v26.0";
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

/**
 * Scopes needed to list the Pages this person manages and publish to them.
 * All three sit at Standard Access, which every app gets automatically — App
 * Review is only required for Advanced Access, i.e. acting on behalf of people
 * who have no role on the app. For a single-user tool posting to its owner's
 * own Page, no review is involved.
 */
export const FACEBOOK_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
];

/**
 * Apps created with the "Manage everything on your Page" use case get Facebook
 * Login for Business, where `config_id` replaces `scope`: the permissions come
 * from a saved login configuration rather than the URL. Apps using classic
 * Facebook Login still take scopes. Both are supported, chosen by whether a
 * configuration id has been provided.
 */
export function buildAuthorizeUrl(creds: FacebookCredentials, state: string) {
  const params = new URLSearchParams({
    client_id: creds.appId,
    redirect_uri: creds.redirectUri,
    response_type: "code",
    state,
  });

  if (creds.configId) {
    params.set("config_id", creds.configId);
    // Login for Business defaults to a token type the configuration decides;
    // this keeps the code-grant flow the callback is written for.
    params.set("override_default_response_type", "true");
  } else {
    params.set("scope", FACEBOOK_SCOPES.join(","));
  }

  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  /** Absent on tokens Meta considers non-expiring. */
  expires_in?: number;
}

async function graphGet(path: string, params: Record<string, string>) {
  const res = await fetch(`${GRAPH_BASE}${path}?${new URLSearchParams(params)}`, {
    signal: AbortSignal.timeout(20_000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.error) {
    throw new Error(body?.error?.message ?? `Facebook request to ${path} failed (${res.status})`);
  }
  return body;
}

/** Short-lived user token (about 1 hour). */
export async function exchangeCodeForToken(
  creds: FacebookCredentials,
  code: string
): Promise<TokenResponse> {
  return graphGet("/oauth/access_token", {
    client_id: creds.appId,
    client_secret: creds.appSecret,
    redirect_uri: creds.redirectUri,
    code,
  });
}

/**
 * Trades a short-lived user token for a long-lived one (~60 days). This matters
 * beyond convenience: Page tokens minted from a long-lived user token never
 * expire, which is what lets the autopilot keep posting unattended.
 */
export async function exchangeForLongLivedToken(
  creds: FacebookCredentials,
  shortLivedToken: string
): Promise<TokenResponse> {
  return graphGet("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: creds.appId,
    client_secret: creds.appSecret,
    fb_exchange_token: shortLivedToken,
  });
}
