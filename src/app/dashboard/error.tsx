"use client";

import { useEffect } from "react";
import { WarningCircle, ArrowClockwise } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <WarningCircle size={28} weight="bold" />
      </div>
      <h2 className="mt-4 font-heading text-lg font-bold text-foreground">Something went wrong</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {error.message || "This page couldn't load. Check your Supabase configuration in .env.local and try again."}
      </p>
      <Button onClick={reset} className="mt-5" size="sm">
        <ArrowClockwise size={14} /> Try again
      </Button>
    </div>
  );
}
