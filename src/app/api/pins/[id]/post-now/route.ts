import { NextResponse } from "next/server";
import { publishPinNow } from "@/lib/pinterest/publish";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const pin = await publishPinNow(id);
    return NextResponse.json({ pin });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to post pin." },
      { status: 502 }
    );
  }
}
