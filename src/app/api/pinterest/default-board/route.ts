import { NextResponse } from "next/server";
import { z } from "zod";
import { updateSettings } from "@/lib/db/settings";
import { withApiErrors } from "@/lib/api";

const Body = z.object({ boardId: z.string().min(1), boardName: z.string().min(1) });

export const POST = withApiErrors(async (req) => {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "boardId and boardName are required." }, { status: 400 });
  }
  await updateSettings({
    default_board_id: parsed.data.boardId,
    default_board_name: parsed.data.boardName,
  });
  return NextResponse.json({ ok: true });
});
