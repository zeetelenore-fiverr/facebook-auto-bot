export type ImageSource = "ai" | "stock";
export type ImageSourcePref = "ai" | "stock" | "mixed";
export type PostStatus = "draft" | "scheduled" | "posted" | "failed";

export interface AppSettings {
  id: 1;
  /** Meta app credentials, normally entered in Settings rather than env vars. */
  facebook_app_id: string | null;
  facebook_app_secret: string | null;
  /** Long-lived user token — lists Pages and mints Page tokens, never posts. */
  facebook_user_token: string | null;
  facebook_token_expires_at: string | null;
  facebook_user_name: string | null;
  default_page_id: string | null;
  default_page_name: string | null;
  /** Page tokens derived from a long-lived user token do not expire. */
  default_page_token: string | null;
  image_source: ImageSourcePref;
  utm_suffix: string;
  auto_post_enabled: boolean;
  posts_per_day: number;
  posting_hours: number[];
  timezone: string;
  last_auto_post_at: string | null;
  updated_at: string;
}

export interface Post {
  id: string;
  topic: string;
  title: string;
  description: string;
  hashtags: string[];
  image_url: string;
  image_source: ImageSource;
  link_url: string | null;
  page_id: string | null;
  page_name: string | null;
  status: PostStatus;
  scheduled_at: string | null;
  posted_at: string | null;
  facebook_post_id: string | null;
  error_message: string | null;
  created_at: string;
}

export interface PageCache {
  page_id: string;
  name: string;
  category: string | null;
  fetched_at: string;
}

/** Which free service actually wrote the copy. "template" means every AI
 *  provider was unreachable and the deterministic fallback was used. */
export type ContentProvider = "groq" | "gemini" | "pollinations" | "template";

export interface GeneratedContent {
  title: string;
  description: string;
  hashtags: string[];
  provider?: ContentProvider;
  /** First provider failure, surfaced so a degraded draft can explain itself. */
  providerError?: string;
}

export const isFacebookConnected = (s: Pick<AppSettings, "facebook_user_token">) =>
  Boolean(s.facebook_user_token);

/**
 * Facebook takes one `message` per post, so the separately-edited parts are
 * composed here — one place, shared by the publisher and the preview.
 */
export function composeMessage(
  post: Pick<Post, "title" | "description" | "hashtags" | "link_url">,
  utmSuffix = ""
): string {
  const tags = post.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ");
  return [post.title, post.description, post.link_url ?? "", tags, utmSuffix]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
}
