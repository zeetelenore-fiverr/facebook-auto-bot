import { NextResponse } from "next/server";
import { z } from "zod";
import { getSettings, updateSettings } from "@/lib/db/settings";
import { withApiErrors } from "@/lib/api";

export const GET = withApiErrors(async () => {
  const settings = await getSettings();
  const { pinterest_access_token, pinterest_refresh_token, ...safe } = settings;
  void pinterest_access_token;
  void pinterest_refresh_token;
  return NextResponse.json({ ...safe, pinterest_connected: Boolean(settings.pinterest_access_token) });
});

const Body = z.object({
  image_source: z.enum(["ai", "stock", "mixed"]).optional(),
  utm_suffix: z.string().max(200).optional(),
  auto_post_enabled: z.boolean().optional(),
  posts_per_day: z.number().int().min(1).max(20).optional(),
  posting_hours: z.array(z.number().int().min(0).max(23)).min(1).max(24).optional(),
  timezone: z.string().min(1).max(64).optional(),
});

export const PATCH = withApiErrors(async (req) => {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings payload." }, { status: 400 });
  }
  const updated = await updateSettings(parsed.data);
  const { pinterest_access_token, pinterest_refresh_token, ...safe } = updated;
  void pinterest_access_token;
  void pinterest_refresh_token;
  return NextResponse.json(safe);
});
