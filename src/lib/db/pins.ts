import { supabaseAdmin } from "@/lib/supabase/server";
import type { Pin, PinStatus } from "@/lib/types";

export async function listPins(opts: { status?: PinStatus | PinStatus[]; limit?: number } = {}): Promise<Pin[]> {
  const db = supabaseAdmin();
  let query = db.from("pins").select("*").order("created_at", { ascending: false });

  if (opts.status) {
    query = Array.isArray(opts.status) ? query.in("status", opts.status) : query.eq("status", opts.status);
  }
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list pins: ${error.message}`);
  return (data ?? []) as Pin[];
}

export async function getPin(id: string): Promise<Pin | null> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("pins").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load pin: ${error.message}`);
  return data as Pin | null;
}

export async function createPinRecord(
  input: Omit<Pin, "id" | "created_at" | "status" | "posted_at" | "pinterest_pin_id" | "error_message"> & {
    status: PinStatus;
  }
): Promise<Pin> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("pins").insert(input).select().single();
  if (error) throw new Error(`Failed to create pin: ${error.message}`);
  return data as Pin;
}

export async function updatePinRecord(id: string, patch: Partial<Pin>): Promise<Pin> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("pins").update(patch).eq("id", id).select().single();
  if (error) throw new Error(`Failed to update pin: ${error.message}`);
  return data as Pin;
}

export async function deletePinRecord(id: string): Promise<void> {
  const db = supabaseAdmin();
  const { error } = await db.from("pins").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete pin: ${error.message}`);
}

/** Scheduled pins whose time has come, oldest first — used by the cron worker. */
export async function listDuePins(nowIso: string): Promise<Pin[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("pins")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(20);
  if (error) throw new Error(`Failed to list due pins: ${error.message}`);
  return (data ?? []) as Pin[];
}
