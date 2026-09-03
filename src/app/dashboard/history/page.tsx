"use client";

import { useEffect, useState } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { Pin, PinStatus } from "@/lib/types";

const FILTERS: { label: string; value: PinStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Posted", value: "posted" },
  { label: "Failed", value: "failed" },
];

export default function HistoryPage() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [filter, setFilter] = useState<PinStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/pins?status=${filter === "all" ? "posted,failed" : filter}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load history.");
        setPins(data.pins ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load history."))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-surface-2"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

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
          <p className="py-10 text-center text-sm text-muted-foreground">No pins here yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Pin</th>
                  <th className="hidden pb-2 font-medium sm:table-cell">Board</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">When</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {pins.map((pin) => (
                  <tr key={pin.id} className="border-b border-border last:border-0">
                    <td className="max-w-[260px] py-3 pr-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={pin.image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{pin.title}</p>
                          {pin.status === "failed" && pin.error_message && (
                            <p className="truncate text-xs text-destructive">{pin.error_message}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden py-3 pr-3 text-muted-foreground sm:table-cell">
                      {pin.board_name ?? "—"}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={pin.status} />
                    </td>
                    <td className="py-3 pr-3 text-xs text-muted-foreground">
                      {new Date(pin.posted_at ?? pin.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 text-right">
                      {pin.pinterest_pin_id && (
                        <a
                          href={`https://www.pinterest.com/pin/${pin.pinterest_pin_id}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          View <ArrowSquareOut size={12} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
