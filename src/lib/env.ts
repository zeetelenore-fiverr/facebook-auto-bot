/**
 * Centralised, typed access to environment variables.
 * Throws a clear error at the call site instead of a silent `undefined`
 * turning into a confusing failure three layers down.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Check .env.local (see .env.example).`
    );
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  // Supabase
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },

  // Single-user admin auth
  get adminPassword() {
    return required("ADMIN_PASSWORD");
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },

  // Meta (Facebook) app. These are optional because the credentials are
  // normally entered in Settings and stored in the database — see
  // lib/facebook/credentials.ts — so that installing this app does not require
  // editing environment variables.
  get facebookAppIdOptional() {
    return optional("FACEBOOK_APP_ID");
  },
  get facebookAppSecretOptional() {
    return optional("FACEBOOK_APP_SECRET");
  },
  get facebookConfigIdOptional() {
    return optional("FACEBOOK_CONFIG_ID");
  },
  /** Only set this to pin a redirect URI that differs from the request origin. */
  get facebookRedirectUriOverride() {
    return optional("FACEBOOK_REDIRECT_URI");
  },

  // Free-tier LLM keys. Both are optional: without either one the app falls
  // back to the keyless Pollinations endpoint, and then to template copy.
  get groqApiKey() {
    return optional("GROQ_API_KEY");
  },
  get geminiApiKey() {
    return optional("GEMINI_API_KEY");
  },

  // Free image sources
  get pexelsApiKey() {
    return optional("PEXELS_API_KEY");
  },

  // Cron
  get cronSecret() {
    return optional("CRON_SECRET");
  },

  /**
   * Origin this deployment is reachable at, used to build redirects back into
   * the dashboard. Vercel injects VERCEL_PROJECT_PRODUCTION_URL on every
   * deployment, so a fresh copy of this app redirects correctly without anyone
   * having to set NEXT_PUBLIC_SITE_URL by hand.
   */
  get siteUrl() {
    const explicit = optional("NEXT_PUBLIC_SITE_URL");
    if (explicit) return explicit;

    const vercelHost = optional("VERCEL_PROJECT_PRODUCTION_URL") || optional("VERCEL_URL");
    if (vercelHost) return `https://${vercelHost}`;

    return "http://localhost:3000";
  },
};
