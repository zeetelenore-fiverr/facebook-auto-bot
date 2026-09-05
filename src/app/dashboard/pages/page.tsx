"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowClockwise, Star, FlagBanner } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PageCache } from "@/lib/types";

export default function PagesPage() {
  const [pages, setPages] = useState<PageCache[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notConnected, setNotConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh: boolean) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    setNotConnected(false);
    try {
      const res = await fetch(`/api/facebook/pages${refresh ? "?refresh=1" : ""}`);
      const data = await res.json();
      if (res.status === 409) {
        setNotConnected(true);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to load Pages.");
      setPages(data.pages ?? []);
      setDefaultId(data.defaultPageId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Pages.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  async function setDefault(page: PageCache) {
    setDefaultId(page.page_id);
    setError(null);
    // Only the id is sent: the server re-fetches the Page token itself so a
    // publishing credential never travels through the browser.
    const res = await fetch("/api/facebook/default-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: page.page_id }),
    });
    if (!res.ok) {
      setDefaultId(null);
      setError((await res.json()).error ?? "Couldn't set that Page as default.");
    }
  }

  if (notConnected) {
    return (
      <Card className="py-10 text-center">
        <p className="font-medium text-foreground">Facebook isn&apos;t connected yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your account to see the Pages you can post to.
        </p>
        <Link href="/dashboard/settings" className="mt-4 inline-block">
          <Button size="sm">Go to Settings</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pick the Page new posts publish to. Only Pages you can create content on are listed.
        </p>
        <Button size="sm" variant="secondary" onClick={() => load(true)} disabled={refreshing}>
          <ArrowClockwise size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh from Facebook"}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : pages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No Pages cached yet — click &quot;Refresh from Facebook&quot;.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {pages.map((page) => {
              const isDefault = page.page_id === defaultId;
              return (
                <div key={page.page_id} className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-3">
                    <FlagBanner size={16} className="text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{page.name}</p>
                      {page.category && (
                        <p className="text-xs text-muted-foreground">{page.category}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isDefault ? "primary" : "secondary"}
                    onClick={() => setDefault(page)}
                  >
                    <Star size={14} weight={isDefault ? "fill" : "regular"} />
                    {isDefault ? "Default" : "Set as default"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
