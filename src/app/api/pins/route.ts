import { NextResponse } from "next/server";
import { z } from "zod";
import { createPinRecord, listPins } from "@/lib/db/pins";
import { publishPinNow } from "@/lib/pinterest/publish";
import { withApiErrors } from "@/lib/api";
import type { PinStatus } from "@/lib/types";

export const GET = withApiErrors(async (req) => {
  const status = new URL(req.url).searchParams.get("status");
  const pins = await listPins({
    status: status ? (status.split(",") as PinStatus[]) : undefined,
  });
  return NextResponse.json({ pins });
});

const Body = z.object({
  topic: z.string().min(1).max(200),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  hashtags: z.array(z.string()).max(15).default([]),
  imageUrl: z.string().url(),
  imageSource: z.enum(["ai", "stock"]),
  destinationUrl: z.string().url().optional().or(z.literal("")),
  boardId: z.string().min(1),
  boardName: z.string().min(1),
  action: z.enum(["draft", "schedule", "post_now"]),
  scheduledAt: z.string().datetime().optional(),
});

export const POST = withApiErrors(async (req) => {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid pin." }, { status: 400 });
  }
  const b = parsed.data;

  if (b.action === "schedule" && !b.scheduledAt) {
    return NextResponse.json({ error: "scheduledAt is required to schedule a pin." }, { status: 400 });
  }

  const pin = await createPinRecord({
    topic: b.topic,
    title: b.title,
    description: b.description,
    hashtags: b.hashtags,
    image_url: b.imageUrl,
    image_source: b.imageSource,
    destination_url: b.destinationUrl || null,
    board_id: b.boardId,
    board_name: b.boardName,
    scheduled_at: b.action === "schedule" ? b.scheduledAt! : null,
    status: b.action === "schedule" ? "scheduled" : "draft",
  });

  if (b.action === "post_now") {
    const posted = await publishPinNow(pin.id);
    return NextResponse.json({ pin: posted });
  }

  return NextResponse.json({ pin });
});
