import { getSettings, updateSettings } from "@/lib/db/settings";
import { createPinRecord } from "@/lib/db/pins";
import { publishPinNow } from "@/lib/pinterest/publish";
import { generateContent } from "@/lib/ai/text";
import { generateImage } from "@/lib/ai/image";
import { getTrendingTopics } from "@/lib/trends";
import { supabaseAdmin } from "@/lib/supabase/server";
import { localParts, startOfTodayIso } from "@/lib/time";
import { isPinterestConnected } from "@/lib/types";
import type { Pin } from "@/lib/types";

export type AutopilotResult =
  | { ran: true; pin: Pin }
  | {
      ran: false;
      reason:
        | "disabled"
        | "not_connected"
        | "no_default_board"
        | "outside_posting_hours"
        | "already_posted_this_slot"
        | "daily_quota_reached";
    };

/**
 * The "fully automatic" half of the product: on each cron tick, decide
 * whether it is time to invent a fresh pin on its own (no human in the
 * loop) and, if so, do it — pick a topic, write the copy, source the
 * image, and publish. Called once per cron invocation; safe to call more
 * often than the posting cadence since every guard is idempotent.
 */
export async function maybeRunAutopilot(): Promise<AutopilotResult> {
  const settings = await getSettings();

  if (!settings.auto_post_enabled) return { ran: false, reason: "disabled" };
  if (!isPinterestConnected(settings)) return { ran: false, reason: "not_connected" };
  if (!settings.default_board_id || !settings.default_board_name) {
    return { ran: false, reason: "no_default_board" };
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
    .from("pins")
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

  const draft = await createPinRecord({
    topic,
    title: content.title,
    description: content.description,
    hashtags: content.hashtags,
    image_url: image.url,
    image_source: image.source,
    destination_url: null,
    board_id: settings.default_board_id,
    board_name: settings.default_board_name,
    scheduled_at: null,
    status: "draft",
  });

  const published = await publishPinNow(draft.id);
  await updateSettings({ last_auto_post_at: new Date().toISOString() });

  return { ran: true, pin: published };
}
