import { NextResponse } from "next/server";
import { z } from "zod";
import { generateContent } from "@/lib/ai/text";

const Body = z.object({ topic: z.string().trim().min(2).max(200) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A topic (2-200 characters) is required." }, { status: 400 });
  }

  const content = await generateContent(parsed.data.topic);
  return NextResponse.json(content);
}
