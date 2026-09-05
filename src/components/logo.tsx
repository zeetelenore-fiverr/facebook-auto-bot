import { cn } from "@/lib/cn";

/**
 * Original monogram mark — a rounded square holding a speech bubble with a
 * spark, for "posts written automatically". Deliberately not a recolour or
 * trace of Facebook's own logo or wordmark.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="40" height="40" rx="12" fill="var(--color-primary)" />
      <path
        d="M12 14.5A2.5 2.5 0 0 1 14.5 12h11a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5H20l-5 4v-4h-.5A2.5 2.5 0 0 1 12 22.5v-8Z"
        fill="var(--color-primary-foreground)"
        fillOpacity="0.95"
      />
      <path
        d="m20 15.2 1.25 2.75L24 19.2l-2.75 1.25L20 23.2l-1.25-2.75L16 19.2l2.75-1.25L20 15.2Z"
        fill="var(--color-primary)"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-heading text-lg font-bold tracking-tight text-foreground">
        Facebook Auto Bot
      </span>
    </div>
  );
}
