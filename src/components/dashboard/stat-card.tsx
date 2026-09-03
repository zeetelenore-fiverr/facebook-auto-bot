import type { Icon } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  icon: IconCmp,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: Icon;
  tone?: "default" | "primary" | "success" | "warning";
}) {
  const toneStyles = {
    default: "bg-surface-2 text-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  }[tone];

  return (
    <Card className="flex items-center gap-4">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", toneStyles)}>
        <IconCmp size={20} weight="bold" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
      </div>
    </Card>
  );
}
