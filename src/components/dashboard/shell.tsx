"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  House,
  MagicWand,
  ClockCountdown,
  ListChecks,
  PushPin,
  GearSix,
  List,
  X,
  SignOut,
} from "@phosphor-icons/react/dist/ssr";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: House },
  { href: "/dashboard/generate", label: "Generate", icon: MagicWand },
  { href: "/dashboard/queue", label: "Queue", icon: ClockCountdown },
  { href: "/dashboard/history", label: "History", icon: ListChecks },
  { href: "/dashboard/boards", label: "Boards", icon: PushPin },
  { href: "/dashboard/settings", label: "Settings", icon: GearSix },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/generate": "Generate a pin",
  "/dashboard/queue": "Queue",
  "/dashboard/history": "History",
  "/dashboard/boards": "Boards",
  "/dashboard/settings": "Settings",
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const title =
    TITLES[pathname] ?? TITLES[Object.keys(TITLES).find((k) => pathname.startsWith(k)) ?? ""] ?? "";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <Logo className="[&>span]:text-base" />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-2"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {NAV.map((item) => {
                const active =
                  item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2"
                    )}
                  >
                    <Icon size={19} weight={active ? "fill" : "regular"} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-2 lg:hidden"
            >
              <List size={19} />
            </button>
            <h1 className="font-heading text-lg font-bold text-foreground">{title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={logout}
              aria-label="Sign out"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
            >
              <SignOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
