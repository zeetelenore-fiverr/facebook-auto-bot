"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  MagicWand,
  ClockCountdown,
  ListChecks,
  FlagBanner,
  GearSix,
} from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: House },
  { href: "/dashboard/generate", label: "Generate", icon: MagicWand },
  { href: "/dashboard/queue", label: "Queue", icon: ClockCountdown },
  { href: "/dashboard/history", label: "History", icon: ListChecks },
  { href: "/dashboard/pages", label: "Pages", icon: FlagBanner },
  { href: "/dashboard/settings", label: "Settings", icon: GearSix },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center px-5">
        <Logo className="[&>span]:text-base" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              )}
            >
              <Icon size={19} weight={active ? "fill" : "regular"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        Free-tier powered · AI text &amp; images at $0
      </div>
    </aside>
  );
}
