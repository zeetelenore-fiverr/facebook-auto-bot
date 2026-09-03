import { NextResponse } from "next/server";
import { z } from "zod";
import { deletePinRecord, getPin, updatePinRecord } from "@/lib/db/pins";
import { withApiErrors } from "@/lib/api";

const Body = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  hashtags: z.array(z.string()).max(15).optional(),
  destinationUrl: z.string().url().optional().or(z.literal("")),
  boardId: z.string().min(1).optional(),
  boardName: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  status: z.enum(["draft", "scheduled"]).optional(),
});

export const PATCH = withApiErrors(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const existing = await getPin(id);
  if (!existing) return NextResponse.json({ error: "Pin not found." }, { status: 404 });
  if (existing.status === "posted") {
    return NextResponse.json({ error: "A posted pin can no longer be edited." }, { status: 409 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update payload." }, { status: 400 });
  }
  const b = parsed.data;

  const updated = await updatePinRecord(id, {
    ...(b.title !== undefined && { title: b.title }),
    ...(b.description !== undefined && { description: b.description }),
    ...(b.hashtags !== undefined && { hashtags: b.hashtags }),
    ...(b.destinationUrl !== undefined && { destination_url: b.destinationUrl || null }),
    ...(b.boardId !== undefined && { board_id: b.boardId }),
    ...(b.boardName !== undefined && { board_name: b.boardName }),
    ...(b.scheduledAt !== undefined && { scheduled_at: b.scheduledAt }),
    ...(b.status !== undefined && { status: b.status }),
  });

  return NextResponse.json({ pin: updated });
});

export const DELETE = withApiErrors(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  await deletePinRecord(id);
  return NextResponse.json({ ok: true });
});
