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

  // Pinterest OAuth app
  get pinterestAppId() {
    return required("PINTEREST_APP_ID");
  },
  get pinterestAppSecret() {
    return required("PINTEREST_APP_SECRET");
  },
  get pinterestRedirectUri() {
    return required("PINTEREST_REDIRECT_URI");
  },

  // Free image sources
  get pexelsApiKey() {
    return optional("PEXELS_API_KEY");
  },

  // Cron
  get cronSecret() {
    return optional("CRON_SECRET");
  },

  get siteUrl() {
    return optional("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  },
};
