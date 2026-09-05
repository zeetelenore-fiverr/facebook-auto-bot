import { supabaseAdmin } from "@/lib/supabase/server";
import type { Post, PostStatus } from "@/lib/types";

export async function listPosts(
  opts: { status?: PostStatus | PostStatus[]; limit?: number } = {}
): Promise<Post[]> {
  const db = supabaseAdmin();
  let query = db.from("posts").select("*").order("created_at", { ascending: false });

  if (opts.status) {
    query = Array.isArray(opts.status)
      ? query.in("status", opts.status)
      : query.eq("status", opts.status);
  }
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list posts: ${error.message}`);
  return (data ?? []) as Post[];
}

export async function getPost(id: string): Promise<Post | null> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("posts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load post: ${error.message}`);
  return data as Post | null;
}

export async function createPostRecord(
  input: Omit<
    Post,
    "id" | "created_at" | "status" | "posted_at" | "facebook_post_id" | "error_message"
  > & {
    status: PostStatus;
  }
): Promise<Post> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("posts").insert(input).select().single();
  if (error) throw new Error(`Failed to create post: ${error.message}`);
  return data as Post;
}

export async function updatePostRecord(id: string, patch: Partial<Post>): Promise<Post> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("posts").update(patch).eq("id", id).select().single();
  if (error) throw new Error(`Failed to update post: ${error.message}`);
  return data as Post;
}

export async function deletePostRecord(id: string): Promise<void> {
  const db = supabaseAdmin();
  const { error } = await db.from("posts").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete post: ${error.message}`);
}

/** Scheduled posts whose time has come, oldest first — used by the cron worker. */
export async function listDuePosts(nowIso: string): Promise<Post[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(20);
  if (error) throw new Error(`Failed to list due posts: ${error.message}`);
  return (data ?? []) as Post[];
}
