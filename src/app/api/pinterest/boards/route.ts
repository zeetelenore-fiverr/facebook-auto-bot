import { NextResponse } from "next/server";
import { fetchBoards, PinterestNotConnectedError } from "@/lib/pinterest/client";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSettings } from "@/lib/db/settings";

export async function GET(req: Request) {
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const db = supabaseAdmin();

  try {
    if (refresh) {
      const boards = await fetchBoards();
      if (boards.length > 0) {
        await db.from("boards_cache").delete().neq("board_id", "");
        await db.from("boards_cache").insert(
          boards.map((b) => ({ board_id: b.id, name: b.name, privacy: b.privacy }))
        );
      }
    }

    const { data: cached } = await db.from("boards_cache").select("*").order("name");
    const settings = await getSettings();

    return NextResponse.json({
      boards: cached ?? [],
      defaultBoardId: settings.default_board_id,
    });
  } catch (err) {
    if (err instanceof PinterestNotConnectedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load boards." },
      { status: 502 }
    );
  }
}
