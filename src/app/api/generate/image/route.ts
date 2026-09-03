import { NextResponse } from "next/server";
import { z } from "zod";
import { generateImage } from "@/lib/ai/image";

const Body = z.object({
  prompt: z.string().trim().min(2).max(300),
  source: z.enum(["ai", "stock", "mixed"]),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A prompt and image source are required." }, { status: 400 });
  }

  try {
    const result = await generateImage(parsed.data.prompt, parsed.data.source);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Image generation failed." },
      { status: 502 }
    );
  }
}
