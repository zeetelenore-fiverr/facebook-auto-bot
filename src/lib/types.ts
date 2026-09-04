export type ImageSource = "ai" | "stock";
export type ImageSourcePref = "ai" | "stock" | "mixed";
export type PinStatus = "draft" | "scheduled" | "posted" | "failed";

export interface AppSettings {
  id: 1;
  pinterest_access_token: string | null;
  pinterest_refresh_token: string | null;
  pinterest_token_expires_at: string | null;
  pinterest_username: string | null;
  default_board_id: string | null;
  default_board_name: string | null;
  image_source: ImageSourcePref;
  utm_suffix: string;
  auto_post_enabled: boolean;
  posts_per_day: number;
  posting_hours: number[];
  timezone: string;
  last_auto_post_at: string | null;
  updated_at: string;
}

export interface Pin {
  id: string;
  topic: string;
  title: string;
  description: string;
  hashtags: string[];
  image_url: string;
  image_source: ImageSource;
  destination_url: string | null;
  board_id: string | null;
  board_name: string | null;
  status: PinStatus;
  scheduled_at: string | null;
  posted_at: string | null;
  pinterest_pin_id: string | null;
  error_message: string | null;
  created_at: string;
}

export interface BoardCache {
  board_id: string;
  name: string;
  privacy: string | null;
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

export const isPinterestConnected = (s: Pick<AppSettings, "pinterest_access_token">) =>
  Boolean(s.pinterest_access_token);
