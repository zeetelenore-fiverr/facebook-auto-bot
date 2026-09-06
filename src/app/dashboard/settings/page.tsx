"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FacebookLogo,
  CheckCircle,
  WarningCircle,
  LinkSimple,
  LinkBreak,
  Key,
  Copy,
  Check,
} from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ImageSourcePref } from "@/lib/types";

const TIMEZONES = [
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Dhaka",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

interface SettingsState {
  facebook_connected: boolean;
  /** False when the deployment has no real Meta app credentials. */
  facebook_configured?: boolean;
  facebook_app_id: string | null;
  facebook_config_id: string | null;
  /** The secret itself never reaches the browser — only whether one is stored. */
  facebook_app_secret_set?: boolean;
  facebook_user_name: string | null;
  default_page_name: string | null;
  image_source: ImageSourcePref;
  utm_suffix: string;
  auto_post_enabled: boolean;
  posts_per_day: number;
  posting_hours: number[];
  timezone: string;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <SettingsForm />
    </Suspense>
  );
}

function SettingsForm() {
  const params = useSearchParams();
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [configId, setConfigId] = useState("");
  const [savingCreds, setSavingCreds] = useState(false);
  const [credsError, setCredsError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"uri" | "domain" | null>(null);
  // Read from the browser rather than configured, so they always match the
  // hostname the user is actually on — the values Facebook compares against.
  const [redirectUri, setRedirectUri] = useState("");
  const [appDomain, setAppDomain] = useState("");

  useEffect(() => {
    setRedirectUri(`${window.location.origin}/api/facebook/oauth/callback`);
    setAppDomain(window.location.hostname);
  }, []);

  const oauthStatus = params.get("facebook");
  const oauthMessage = params.get("message");

  useEffect(() => {
    fetch("/api/settings")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load settings.");
        setSettings(data);
        setAppId(data.facebook_app_id ?? "");
        setConfigId(data.facebook_config_id ?? "");
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load settings."));
  }, []);

  async function saveCredentials() {
    setCredsError(null);
    if (!appId.trim()) {
      setCredsError("Enter the App ID from your Meta app.");
      return;
    }
    // An already-stored secret is left alone unless a new one is typed, so the
    // masked field does not have to round-trip the real value.
    if (!appSecret.trim() && !settings?.facebook_app_secret_set) {
      setCredsError("Enter the App Secret from App settings > Basic.");
      return;
    }

    setSavingCreds(true);
    try {
      const res = await fetch("/api/facebook/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: appId.trim(),
          appSecret: appSecret.trim() || undefined,
          configId: configId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save those credentials.");

      setAppSecret("");
      setSettings((s) =>
        s
          ? {
              ...s,
              facebook_app_id: appId.trim(),
              facebook_config_id: configId.trim() || null,
              facebook_app_secret_set: true,
              facebook_configured: true,
            }
          : s
      );
    } catch (err) {
      setCredsError(err instanceof Error ? err.message : "Couldn't save those credentials.");
    } finally {
      setSavingCreds(false);
    }
  }

  async function copyValue(value: string, which: "uri" | "domain") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCredsError("Copying failed — select the field and copy manually.");
    }
  }

  async function save(patch: Partial<SettingsState>) {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      setSettings((s) => (s ? { ...s, ...data } : s));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function disconnect() {
    setDisconnecting(true);
    await fetch("/api/facebook/disconnect", { method: "POST" });
    setSettings((s) =>
      s ? { ...s, facebook_connected: false, facebook_user_name: null, default_page_name: null } : s
    );
    setDisconnecting(false);
  }

  function toggleHour(hour: number) {
    if (!settings) return;
    const has = settings.posting_hours.includes(hour);
    const next = has ? settings.posting_hours.filter((h) => h !== hour) : [...settings.posting_hours, hour].sort((a, b) => a - b);
    setSettings({ ...settings, posting_hours: next });
    save({ posting_hours: next });
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
        {loadError}
      </div>
    );
  }

  if (!settings) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {oauthStatus === "connected" && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3.5 text-sm text-success">
          <CheckCircle size={18} /> Facebook account connected.
        </div>
      )}
      {oauthStatus === "error" && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
          <WarningCircle size={18} /> {oauthMessage ?? "Couldn't connect Facebook."}
        </div>
      )}

      {/* Facebook connection */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FacebookLogo size={22} weight="fill" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-foreground">Facebook account</h2>
              {settings.facebook_connected ? (
                <p className="mt-0.5 text-sm text-success">
                  Connected as {settings.facebook_user_name ?? "your account"}
                </p>
              ) : settings.facebook_configured === false ? (
                <p className="mt-0.5 max-w-md text-sm text-muted-foreground">
                  Add your Meta App ID and secret below to enable connecting.
                  Everything else works without them.
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-muted-foreground">Not connected yet</p>
              )}
            </div>
          </div>
          {settings.facebook_connected ? (
            <Button size="sm" variant="secondary" onClick={disconnect} disabled={disconnecting}>
              <LinkBreak size={14} /> Disconnect
            </Button>
          ) : (
            <a
              href="/api/facebook/oauth/start"
              aria-disabled={settings.facebook_configured === false}
              className={settings.facebook_configured === false ? "pointer-events-none" : undefined}
            >
              <Button size="sm" disabled={settings.facebook_configured === false}>
                <LinkSimple size={14} /> Connect
              </Button>
            </a>
          )}
        </div>
      </Card>

      {/* Meta app credentials */}
      <Card>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-muted-foreground">
            <Key size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading font-bold text-foreground">Meta app</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Create one at{" "}
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                developers.facebook.com/apps
              </a>{" "}
              with the <strong>&quot;Manage everything on your Page&quot;</strong> use case — not
              the Facebook Login one, which Meta treats as incompatible with Page
              management. Posting to a Page you administer needs no App Review.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">App ID</label>
                <input
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="1234567890123456"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">App Secret</label>
                <input
                  type="password"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder={
                    settings.facebook_app_secret_set ? "•••• saved — type to replace" : "from App settings > Basic"
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs font-semibold text-muted-foreground">
                Login configuration ID
              </label>
              <input
                value={configId}
                onChange={(e) => setConfigId(e.target.value)}
                placeholder="required if your app uses Facebook Login for Business"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Apps created with the &quot;Manage everything on your Page&quot; use case use
                Facebook Login for Business, where this replaces the permission list.
                Find it under <strong>Facebook Login for Business → Configurations</strong>.
                Leave blank for classic Facebook Login.
              </p>
            </div>

            <div className="mt-3">
              <label className="text-xs font-semibold text-muted-foreground">
                Redirect URI — paste this into your Meta app&apos;s login settings, under Valid OAuth Redirect URIs
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  readOnly
                  value={redirectUri}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 font-mono text-xs text-muted-foreground outline-none"
                />
                <Button size="sm" variant="secondary" onClick={() => copyValue(redirectUri, "uri")}>
                  {copied === "uri" ? <Check size={14} /> : <Copy size={14} />}
                  {copied === "uri" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs font-semibold text-muted-foreground">
                App Domain — paste this into App settings &gt; Basic &gt; App Domains
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  readOnly
                  value={appDomain}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 font-mono text-xs text-muted-foreground outline-none"
                />
                <Button size="sm" variant="secondary" onClick={() => copyValue(appDomain, "domain")}>
                  {copied === "domain" ? <Check size={14} /> : <Copy size={14} />}
                  {copied === "domain" ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Without this, Facebook refuses the login with
                &quot;Can&apos;t load URL: the domain of this URL isn&apos;t included in the
                app&apos;s domains&quot;. No <code className="rounded bg-surface-2 px-1 text-[11px]">https://</code>,
                no trailing slash.
              </p>
            </div>

            {credsError && <p className="mt-2 text-xs text-destructive">{credsError}</p>}

            <div className="mt-4 flex items-center gap-2">
              <Button size="sm" onClick={saveCredentials} disabled={savingCreds}>
                {savingCreds ? "Saving…" : "Save credentials"}
              </Button>
              {settings.facebook_configured && (
                <span className="text-xs font-medium text-success">Credentials stored</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Generation preferences */}
      <Card>
        <h2 className="font-heading font-bold text-foreground">Generation preferences</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Every source here is free — no paid API keys required.
        </p>

        <div className="mt-4">
          <label className="text-xs font-semibold text-muted-foreground">Default image source</label>
          <select
            value={settings.image_source}
            onChange={(e) => {
              const v = e.target.value as ImageSourcePref;
              setSettings({ ...settings, image_source: v });
              save({ image_source: v });
            }}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary sm:w-64"
          >
            <option value="ai">AI-generated image</option>
            <option value="stock">Free stock photo</option>
            <option value="mixed">Mix of both</option>
          </select>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-muted-foreground">
            Text appended to every post (optional, e.g. a UTM link or sign-off)
          </label>
          <input
            value={settings.utm_suffix}
            onChange={(e) => setSettings({ ...settings, utm_suffix: e.target.value })}
            onBlur={(e) => save({ utm_suffix: e.target.value })}
            placeholder="via mysite.com"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
      </Card>

      {/* Autopilot */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-bold text-foreground">Autopilot</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Let the bot pick a topic and post on its own, with no one clicking anything.
            </p>
          </div>
          <button
            onClick={() => {
              const next = !settings.auto_post_enabled;
              setSettings({ ...settings, auto_post_enabled: next });
              save({ auto_post_enabled: next });
            }}
            aria-label="Toggle autopilot"
            className={cn(
              "relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition",
              settings.auto_post_enabled ? "bg-primary" : "bg-surface-2"
            )}
          >
            <span
              className={cn(
                "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
                settings.auto_post_enabled ? "left-6" : "left-1"
              )}
            />
          </button>
        </div>

        {!settings.default_page_name && (
          <p className="mt-3 text-xs text-warning">
            Set a default Page on the Pages screen — autopilot needs one to post to.
          </p>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Posts per day</label>
            <input
              type="number"
              min={1}
              max={20}
              value={settings.posts_per_day}
              onChange={(e) => setSettings({ ...settings, posts_per_day: Number(e.target.value) })}
              onBlur={(e) => save({ posts_per_day: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => {
                setSettings({ ...settings, timezone: e.target.value });
                save({ timezone: e.target.value });
              }}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-muted-foreground">
            Allowed posting hours (local time)
          </label>
          <div className="mt-1.5 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {Array.from({ length: 24 }, (_, h) => h).map((h) => (
              <button
                key={h}
                onClick={() => toggleHour(h)}
                className={cn(
                  "cursor-pointer rounded-lg py-1.5 text-xs font-medium transition",
                  settings.posting_hours.includes(h)
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-2 text-muted-foreground hover:bg-border"
                )}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="h-4 text-right text-xs text-muted-foreground">
        {saving ? "Saving…" : saved ? "Saved ✓" : ""}
      </div>
    </div>
  );
}
