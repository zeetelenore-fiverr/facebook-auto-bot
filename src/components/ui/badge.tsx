import { cn } from "@/lib/cn";
import type { PinStatus } from "@/lib/types";

const STATUS_STYLES: Record<PinStatus, string> = {
  draft: "bg-surface-2 text-muted-foreground",
  scheduled: "bg-warning/15 text-warning",
  posted: "bg-success/15 text-success",
  failed: "bg-destructive/15 text-destructive",
};

const STATUS_LABEL: Record<PinStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  posted: "Posted",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: PinStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        STATUS_STYLES[status]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
