import { cn } from "@/lib/cn";

/**
 * Original monogram mark — a rounded square with a stylised pin-drop,
 * deliberately not a recolour or trace of Pinterest's own logo.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="40" height="40" rx="12" fill="var(--color-primary)" />
      <path
        d="M20 10c-4.97 0-9 3.9-9 8.7 0 3.55 2.13 6.6 5.2 7.95-.07-.68-.13-1.72.03-2.46.14-.66.94-4.2.94-4.2s-.24-.48-.24-1.18c0-1.11.65-1.94 1.45-1.94.69 0 1.02.51 1.02 1.13 0 .69-.44 1.72-.67 2.67-.19.8.4 1.45 1.2 1.45 1.43 0 2.53-1.5 2.53-3.68 0-1.92-1.39-3.27-3.37-3.27-2.3 0-3.65 1.71-3.65 3.48 0 .69.27 1.43.6 1.83.07.08.08.15.06.23-.06.27-.21.8-.24.92-.04.15-.13.19-.29.11-1.08-.5-1.76-2.07-1.76-3.33 0-2.71 1.98-5.2 5.7-5.2 2.99 0 5.32 2.12 5.32 4.96 0 2.96-1.87 5.34-4.46 5.34-.87 0-1.69-.45-1.97-.99l-.53 2.05c-.19.75-.72 1.68-1.07 2.25.8.25 1.66.38 2.55.38 4.97 0 9-3.9 9-8.7S24.97 10 20 10Z"
        fill="var(--color-primary-foreground)"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-heading text-lg font-bold tracking-tight text-foreground">
        Pinterest Auto Bot
      </span>
    </div>
  );
}
