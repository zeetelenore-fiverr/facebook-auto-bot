import Link from "next/link";
import {
  MegaphoneSimple,
  CalendarCheck,
  ClockCountdown,
  ChartLineUp,
  Sparkle,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { PostsChart } from "@/components/dashboard/posts-chart";
import { listPosts } from "@/lib/db/posts";
import { getSettings } from "@/lib/db/settings";
import { isFacebookConnected } from "@/lib/types";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

function buildChartData(posted: { posted_at: string | null }[]) {
  const days = 14;
  const counts = new Map<string, number>();
  const today = new Date();

  const labels: { date: string; label: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    counts.set(key, 0);
    labels.push({ date: key, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
  }

  for (const post of posted) {
    if (!post.posted_at) continue;
    const key = post.posted_at.slice(0, 10);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return labels.map((l) => ({ ...l, count: counts.get(l.date) ?? 0 }));
}

export default async function DashboardOverviewPage() {
  const [posts, settings] = await Promise.all([listPosts({ limit: 200 }), getSettings()]);

  const posted = posts.filter((p: Post) => p.status === "posted");
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const postedThisWeek = posted.filter((p: Post) => p.posted_at && new Date(p.posted_at).getTime() > weekAgo);
  const scheduled = posts.filter((p: Post) => p.status === "scheduled");
  const failed = posts.filter((p: Post) => p.status === "failed");
  const recent = posts.slice(0, 8);
  const connected = isFacebookConnected(settings);

  const chartData = buildChartData(posted);

  return (
    <div className="space-y-6">
      {!connected && (
        <Card className="flex flex-col items-start justify-between gap-3 border-primary/30 bg-primary/5 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold text-foreground">Connect Facebook to start posting</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              You can still generate and preview posts, but publishing needs a connected Page.
            </p>
          </div>
          <Link href="/dashboard/settings">
            <Button size="sm">
              Connect now <ArrowRight size={14} />
            </Button>
          </Link>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total posted" value={posted.length} icon={MegaphoneSimple} tone="primary" />
        <StatCard label="Posted this week" value={postedThisWeek.length} icon={CalendarCheck} tone="success" />
        <StatCard label="In queue" value={scheduled.length} icon={ClockCountdown} tone="warning" />
        <StatCard label="Failed" value={failed.length} icon={ChartLineUp} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-foreground">Posts published — last 14 days</h2>
          </div>
          <PostsChart data={chartData} />
        </Card>

        <Card className="flex flex-col">
          <h2 className="font-heading text-base font-bold text-foreground">Quick generate</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a topic and let the bot write the copy and source the image.
          </p>
          <Link href="/dashboard/generate" className="mt-4">
            <Button className="w-full">
              <Sparkle size={16} weight="fill" /> Generate a post
            </Button>
          </Link>

          <div className="mt-5 border-t border-border pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Facebook</span>
              <span className={connected ? "font-medium text-success" : "font-medium text-muted-foreground"}>
                {connected ? (settings.facebook_user_name ?? "Connected") : "Not connected"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground">Page</span>
              <span className="truncate font-medium text-foreground">
                {settings.default_page_name ?? "—"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground">Autopilot</span>
              <span className={settings.auto_post_enabled ? "font-medium text-success" : "font-medium text-muted-foreground"}>
                {settings.auto_post_enabled ? `On · ${settings.posts_per_day}/day` : "Off"}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-base font-bold text-foreground">Recent activity</h2>
          <Link href="/dashboard/history" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No posts yet — generate your first one to see it here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {recent.map((post: Post) => (
                  <tr key={post.id} className="border-b border-border last:border-0">
                    <td className="w-10 py-2.5 pr-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    </td>
                    <td className="max-w-[220px] truncate py-2.5 pr-3 font-medium text-foreground">
                      {post.title}
                    </td>
                    <td className="hidden py-2.5 pr-3 text-muted-foreground sm:table-cell">
                      {post.page_name ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusBadge status={post.status} />
                    </td>
                    <td className="py-2.5 text-right text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
