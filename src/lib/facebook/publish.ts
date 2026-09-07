import { publishPhoto, NoPageSelectedError } from "@/lib/facebook/client";
import { getPost, updatePostRecord } from "@/lib/db/posts";
import { getSettings } from "@/lib/db/settings";
import { composeMessage } from "@/lib/types";
import type { Post } from "@/lib/types";

/**
 * Publishes one queued post to its Facebook Page and records the outcome.
 * Shared by the "post now" route and the scheduled-queue cron worker so there
 * is exactly one place that talks to the Graph publish endpoint.
 */
export async function publishPostNow(postId: string): Promise<Post> {
  const post = await getPost(postId);
  if (!post) throw new Error("Post not found.");

  const settings = await getSettings();

  // A post carries the Page it was written for, but the token lives in
  // settings, so a Page that is no longer the selected one cannot be posted to.
  const pageId = post.page_id ?? settings.default_page_id;
  const pageToken =
    post.page_id && post.page_id !== settings.default_page_id ? null : settings.default_page_token;

  if (!pageId || !pageToken) {
    return updatePostRecord(postId, {
      status: "failed",
      error_message: new NoPageSelectedError().message,
    });
  }

  try {
    const result = await publishPhoto({
      pageId,
      pageToken,
      message: composeMessage(post, settings.utm_suffix),
      imageUrl: post.image_url,
    });

    return await updatePostRecord(postId, {
      status: "posted",
      facebook_post_id: result.id,
      posted_at: new Date().toISOString(),
      error_message: null,
    });
  } catch (err) {
    let message = err instanceof Error ? err.message : "Unknown error while posting.";

    // Facebook reports a token that lacks pages_manage_posts as a bare
    // "(#200) Permissions error", which says nothing about what to fix.
    if (/\(#200\)|permissions? error/i.test(message)) {
      message =
        "Facebook rejected this for missing permissions. The connected token needs " +
        "pages_manage_posts. Add it to your Meta app — and to the Login for Business " +
        "configuration if you use one — then disconnect and connect again so a new " +
        "token is issued.";
    }

    return await updatePostRecord(postId, { status: "failed", error_message: message });
  }
}
