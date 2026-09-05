"use client";

import { useCallback, useEffect, useState } from "react";
import { Rocket, Trash, PencilSimple, X, Check } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import type { Post } from "@/lib/types";

function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function QueuePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTime, setDraftTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/posts?status=draft,scheduled");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load the queue.");
      setPosts(data.posts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function postNow(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${id}/post-now`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.post?.status === "failed") throw new Error(data.post.error_message ?? "Posting failed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/posts/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function saveSchedule(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: draftTime ? new Date(draftTime).toISOString() : null,
          status: draftTime ? "scheduled" : "draft",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
          {error}
        </div>
      )}

      {!error && (
        <Card>
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nothing queued. Generate a post and save it as a draft or schedule it to see it here.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {posts.map((post) => (
              <div key={post.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{post.title}</p>
                    <StatusBadge status={post.status} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{post.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Page: {post.page_name ?? "—"}
                    {post.scheduled_at &&
                      ` · Scheduled for ${new Date(post.scheduled_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}`}
                  </p>

                  {editingId === post.id && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={draftTime}
                        onChange={(e) => setDraftTime(e.target.value)}
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                      />
                      <button
                        onClick={() => saveSchedule(post.id)}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-success/10 text-success"
                        aria-label="Save"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-surface-2 text-muted-foreground"
                        aria-label="Cancel"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingId(post.id);
                      setDraftTime(toLocalInputValue(post.scheduled_at));
                    }}
                  >
                    <PencilSimple size={14} /> Reschedule
                  </Button>
                  <Button size="sm" onClick={() => postNow(post.id)} disabled={busyId === post.id}>
                    <Rocket size={14} weight="fill" /> {busyId === post.id ? "Posting…" : "Post now"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(post.id)} disabled={busyId === post.id}>
                    <Trash size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        </Card>
      )}
    </div>
  );
}
