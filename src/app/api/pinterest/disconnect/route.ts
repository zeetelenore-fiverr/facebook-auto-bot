import { NextResponse } from "next/server";
import { updateSettings } from "@/lib/db/settings";
import { supabaseAdmin } from "@/lib/supabase/server";
import { withApiErrors } from "@/lib/api";

export const POST = withApiErrors(async () => {
  await updateSettings({
    pinterest_access_token: null,
    pinterest_refresh_token: null,
    pinterest_token_expires_at: null,
    pinterest_username: null,
    default_board_id: null,
    default_board_name: null,
  });
  await supabaseAdmin().from("boards_cache").delete().neq("board_id", "");
  return NextResponse.json({ ok: true });
});
