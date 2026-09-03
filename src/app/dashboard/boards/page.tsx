"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowClockwise, Star, LockSimple, Globe } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BoardCache } from "@/lib/types";

export default function BoardsPage() {
  const [boards, setBoards] = useState<BoardCache[]>([]);
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
      const res = await fetch(`/api/pinterest/boards${refresh ? "?refresh=1" : ""}`);
      const data = await res.json();
      if (res.status === 409) {
        setNotConnected(true);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to load boards.");
      setBoards(data.boards ?? []);
      setDefaultId(data.defaultBoardId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load boards.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  async function setDefault(board: BoardCache) {
    setDefaultId(board.board_id);
    await fetch("/api/pinterest/default-board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: board.board_id, boardName: board.name }),
    });
  }

  if (notConnected) {
    return (
      <Card className="py-10 text-center">
        <p className="font-medium text-foreground">Pinterest isn&apos;t connected yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Connect your account to see and pick boards.</p>
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
          Pick the board new pins default to. You can still choose a different one per pin.
        </p>
        <Button size="sm" variant="secondary" onClick={() => load(true)} disabled={refreshing}>
          <ArrowClockwise size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh from Pinterest"}
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
        ) : boards.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No boards cached yet — click &quot;Refresh from Pinterest&quot;.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {boards.map((board) => {
              const isDefault = board.board_id === defaultId;
              return (
                <div key={board.board_id} className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-3">
                    {board.privacy === "PUBLIC" ? (
                      <Globe size={16} className="text-muted-foreground" />
                    ) : (
                      <LockSimple size={16} className="text-muted-foreground" />
                    )}
                    <p className="font-medium text-foreground">{board.name}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={isDefault ? "primary" : "secondary"}
                    onClick={() => setDefault(board)}
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
