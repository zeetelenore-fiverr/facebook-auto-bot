"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FacebookLogo,
  CheckCircle,
  WarningCircle,
  LinkSimple,
  LinkBreak,
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

  const oauthStatus = params.get("facebook");
  const oauthMessage = params.get("message");

  useEffect(() => {
    fetch("/api/settings")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load settings.");
        setSettings(data);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load settings."));
  }, []);

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
                  This deployment has no Meta app credentials yet, so connecting
                  would fail on Facebook&apos;s side. Add{" "}
                  <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">FACEBOOK_APP_ID</code>{" "}
                  and{" "}
                  <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">FACEBOOK_APP_SECRET</code>{" "}
                  to enable it. Everything else works without them.
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
            <label className="text-xs font-semibold text-muted-foreground">Pins per day</label>
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
