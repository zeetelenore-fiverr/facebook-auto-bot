"use client";

import { useCallback, useEffect, useState } from "react";
import { Rocket, Trash, PencilSimple, X, Check } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import type { Pin } from "@/lib/types";

function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function QueuePage() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTime, setDraftTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pins?status=draft,scheduled");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load the queue.");
      setPins(data.pins ?? []);
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
      const res = await fetch(`/api/pins/${id}/post-now`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.pin?.status === "failed") throw new Error(data.pin.error_message ?? "Posting failed.");
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
      await fetch(`/api/pins/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function saveSchedule(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/pins/${id}`, {
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
        ) : pins.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nothing queued. Generate a pin and save it as a draft or schedule it to see it here.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {pins.map((pin) => (
              <div key={pin.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pin.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{pin.title}</p>
                    <StatusBadge status={pin.status} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{pin.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Board: {pin.board_name ?? "—"}
                    {pin.scheduled_at &&
                      ` · Scheduled for ${new Date(pin.scheduled_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}`}
                  </p>

                  {editingId === pin.id && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={draftTime}
                        onChange={(e) => setDraftTime(e.target.value)}
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                      />
                      <button
                        onClick={() => saveSchedule(pin.id)}
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
                      setEditingId(pin.id);
                      setDraftTime(toLocalInputValue(pin.scheduled_at));
                    }}
                  >
                    <PencilSimple size={14} /> Reschedule
                  </Button>
                  <Button size="sm" onClick={() => postNow(pin.id)} disabled={busyId === pin.id}>
                    <Rocket size={14} weight="fill" /> {busyId === pin.id ? "Posting…" : "Post now"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(pin.id)} disabled={busyId === pin.id}>
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
