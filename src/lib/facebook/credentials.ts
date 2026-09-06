import { env } from "@/lib/env";
import { getSettings } from "@/lib/db/settings";

export interface FacebookCredentials {
  appId: string;
  appSecret: string;
  redirectUri: string;
  /** Set when the Meta app uses Facebook Login for Business. */
  configId: string | null;
}

const PLACEHOLDER = "not-configured";
const isBlank = (v: string | null | undefined) => !v || v === PLACEHOLDER;

/**
 * The Meta app's credentials, from the database first and environment second.
 *
 * Storing them in the database is what makes this app installable by someone
 * who is not going to edit environment variables: they paste the App ID and
 * secret into Settings and the deployment is configured. The env vars remain
 * supported so an operator who prefers them keeps working, and so a fresh
 * database can be pre-seeded.
 *
 * The redirect URI is derived from the request's own origin rather than
 * configured, because it must match byte-for-byte between the authorize call
 * and the token exchange — deriving it removes the single most common way to
 * get that wrong, and the project answers on more than one hostname.
 */
export async function getFacebookCredentials(origin: string): Promise<FacebookCredentials | null> {
  let appId = env.facebookAppIdOptional;
  let appSecret = env.facebookAppSecretOptional;
  let configId: string | null = env.facebookConfigIdOptional || null;

  try {
    const settings = await getSettings();
    if (!isBlank(settings.facebook_app_id)) appId = settings.facebook_app_id!;
    if (!isBlank(settings.facebook_app_secret)) appSecret = settings.facebook_app_secret!;
    if (!isBlank(settings.facebook_config_id)) configId = settings.facebook_config_id;
  } catch {
    // Settings unreadable (fresh install, database down) — fall back to env.
  }

  if (isBlank(appId) || isBlank(appSecret)) return null;

  return {
    appId,
    appSecret,
    configId,
    redirectUri: env.facebookRedirectUriOverride || `${origin}/api/facebook/oauth/callback`,
  };
}

/** Cheap check for the UI: are real credentials present anywhere? */
export async function isFacebookConfigured(): Promise<boolean> {
  if (!isBlank(env.facebookAppIdOptional) && !isBlank(env.facebookAppSecretOptional)) return true;
  try {
    const settings = await getSettings();
    return !isBlank(settings.facebook_app_id) && !isBlank(settings.facebook_app_secret);
  } catch {
    return false;
  }
}
