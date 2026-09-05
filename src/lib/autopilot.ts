import { getSettings, updateSettings } from "@/lib/db/settings";
import { createPostRecord } from "@/lib/db/posts";
import { publishPostNow } from "@/lib/facebook/publish";
import { generateContent } from "@/lib/ai/text";
import { generateImage } from "@/lib/ai/image";
import { getTrendingTopics } from "@/lib/trends";
import { supabaseAdmin } from "@/lib/supabase/server";
import { localParts, startOfTodayIso } from "@/lib/time";
import { isFacebookConnected } from "@/lib/types";
import type { Post } from "@/lib/types";

export type AutopilotResult =
  | { ran: true; post: Post }
  | {
      ran: false;
      reason:
        | "disabled"
        | "not_connected"
        | "no_default_page"
        | "outside_posting_hours"
        | "already_posted_this_slot"
        | "daily_quota_reached";
    };

/**
 * The "fully automatic" half of the product: on each cron tick, decide
 * whether it is time to invent a fresh post on its own (no human in the
 * loop) and, if so, do it — pick a topic, write the copy, source the
 * image, and publish. Called once per cron invocation; safe to call more
 * often than the posting cadence since every guard is idempotent.
 */
export async function maybeRunAutopilot(): Promise<AutopilotResult> {
  const settings = await getSettings();

  if (!settings.auto_post_enabled) return { ran: false, reason: "disabled" };
  if (!isFacebookConnected(settings)) return { ran: false, reason: "not_connected" };
  if (!settings.default_page_id || !settings.default_page_token) {
    return { ran: false, reason: "no_default_page" };
  }

  const { dateKey, hour } = localParts(new Date(), settings.timezone);
  if (!settings.posting_hours.includes(hour)) {
    return { ran: false, reason: "outside_posting_hours" };
  }

  if (settings.last_auto_post_at) {
    const last = localParts(new Date(settings.last_auto_post_at), settings.timezone);
    if (last.dateKey === dateKey && last.hour === hour) {
      return { ran: false, reason: "already_posted_this_slot" };
    }
  }

  const db = supabaseAdmin();
  const { count } = await db
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "posted")
    .gte("posted_at", startOfTodayIso(settings.timezone));

  if ((count ?? 0) >= settings.posts_per_day) {
    return { ran: false, reason: "daily_quota_reached" };
  }

  const { topics } = await getTrendingTopics();
  const topic = topics[Math.floor(Math.random() * topics.length)];

  const content = await generateContent(topic);
  const image = await generateImage(`${content.title} — ${topic}`, settings.image_source);

  const draft = await createPostRecord({
    topic,
    title: content.title,
    description: content.description,
    hashtags: content.hashtags,
    image_url: image.url,
    image_source: image.source,
    link_url: null,
    page_id: settings.default_page_id,
    page_name: settings.default_page_name,
    scheduled_at: null,
    status: "draft",
  });

  const published = await publishPostNow(draft.id);
  await updateSettings({ last_auto_post_at: new Date().toISOString() });

  return { ran: true, post: published };
}
