#!/usr/bin/env bash
# Deploys this project to Vercel using the account owner's own CLI token.
#
# The Claude<->Vercel integration can build this project but has no rights over
# it, so its deployments fail at the final "assign to project / attach domain"
# step. Deploying with a personal token avoids that path entirely and is also
# the only way to set environment variables from here.
#
# Usage: bash scripts/deploy.sh /path/to/secrets.txt
# The secrets file is KEY=value lines; it is never committed and never printed.
set -euo pipefail

SECRETS_FILE="${1:?usage: deploy.sh <secrets-file>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1090
set -a; source "$SECRETS_FILE"; set +a

: "${VERCEL_TOKEN:?VERCEL_TOKEN missing in secrets file}"
: "${ADMIN_PASSWORD:?ADMIN_PASSWORD missing in secrets file}"

SCOPE="${VERCEL_SCOPE:-pkskills2}"
PROJECT="${VERCEL_PROJECT:-pinterest-auto-bot}"
VC="npx -y vercel@latest"

# SESSION_SECRET only needs to be stable, not memorable.
SESSION_SECRET="${SESSION_SECRET:-$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')}"

echo "==> Linking $SCOPE/$PROJECT"
$VC link --yes --project "$PROJECT" --scope "$SCOPE" --token "$VERCEL_TOKEN"

put_env() {
  local key="$1" value="$2"
  # Remove first so re-runs update rather than fail on an existing key.
  $VC env rm "$key" production --yes --token "$VERCEL_TOKEN" >/dev/null 2>&1 || true
  printf '%s' "$value" | $VC env add "$key" production --token "$VERCEL_TOKEN" >/dev/null
  echo "    set $key"
}

if [ "${SKIP_ENV:-0}" = "1" ]; then
  echo "==> Skipping environment variables (SKIP_ENV=1)"
else
  echo "==> Setting production environment variables"
put_env NEXT_PUBLIC_SUPABASE_URL   "${NEXT_PUBLIC_SUPABASE_URL:?}"
put_env SUPABASE_SERVICE_ROLE_KEY  "${SUPABASE_SERVICE_ROLE_KEY:?}"
put_env ADMIN_PASSWORD             "$ADMIN_PASSWORD"
put_env SESSION_SECRET             "$SESSION_SECRET"
# Pinterest credentials are read lazily, so placeholders keep every other
# feature working until a real Pinterest app exists.
put_env PINTEREST_APP_ID           "${PINTEREST_APP_ID:-not-configured}"
put_env PINTEREST_APP_SECRET       "${PINTEREST_APP_SECRET:-not-configured}"
put_env PINTEREST_REDIRECT_URI     "${PINTEREST_REDIRECT_URI:-https://$PROJECT.vercel.app/api/pinterest/oauth/callback}"
[ -n "${PEXELS_API_KEY:-}" ] && put_env PEXELS_API_KEY "$PEXELS_API_KEY"
fi

echo "==> Deploying to production"
$VC deploy --prod --token "$VERCEL_TOKEN"
