import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { listDuePins } from "@/lib/db/pins";
import { publishPinNow } from "@/lib/pinterest/publish";
import { maybeRunAutopilot } from "@/lib/autopilot";
import { withApiErrors } from "@/lib/api";

export const maxDuration = 60;

/**
 * Single entry point meant to be hit on a schedule (Vercel Cron, or any
 * free external pinger such as cron-job.org — see README). Two jobs:
 *  1. Publish any scheduled pin whose time has come.
 *  2. Let the autopilot decide whether to invent and post a brand-new pin.
 * Protected by CRON_SECRET so the endpoint can't be triggered by anyone
 * who finds the URL.
 */
export const GET = withApiErrors(async (req) => {
  if (env.cronSecret) {
    const auth = req.headers.get("authorization");
    const provided = new URL(req.url).searchParams.get("secret");
    if (auth !== `Bearer ${env.cronSecret}` && provided !== env.cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const due = await listDuePins(new Date().toISOString());
  const publishedFromQueue = [];
  for (const pin of due) {
    const result = await publishPinNow(pin.id);
    publishedFromQueue.push({ id: result.id, status: result.status });
  }

  const autopilot = await maybeRunAutopilot();

  return NextResponse.json({
    processedFromQueue: publishedFromQueue.length,
    queueResults: publishedFromQueue,
    autopilot,
  });
});
