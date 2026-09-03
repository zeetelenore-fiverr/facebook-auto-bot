import { createPin } from "@/lib/pinterest/client";
import { getPin, updatePinRecord } from "@/lib/db/pins";
import { getSettings } from "@/lib/db/settings";
import type { Pin } from "@/lib/types";

/**
 * Publishes one queued pin to Pinterest and records the outcome. Shared by
 * the "post now" API route and the scheduled-queue cron worker so there is
 * exactly one place that talks to the Pinterest create-pin endpoint.
 */
export async function publishPinNow(pinId: string): Promise<Pin> {
  const pin = await getPin(pinId);
  if (!pin) throw new Error("Pin not found.");

  if (!pin.board_id) {
    return updatePinRecord(pinId, {
      status: "failed",
      error_message: "No board selected for this pin.",
    });
  }

  const settings = await getSettings();
  const description = settings.utm_suffix
    ? `${pin.description}${pin.description.includes(settings.utm_suffix) ? "" : ` ${settings.utm_suffix}`}`
    : pin.description;

  try {
    const result = await createPin({
      boardId: pin.board_id,
      title: pin.title,
      description,
      imageUrl: pin.image_url,
      destinationUrl: pin.destination_url,
    });

    return await updatePinRecord(pinId, {
      status: "posted",
      pinterest_pin_id: result.id,
      posted_at: new Date().toISOString(),
      error_message: null,
    });
  } catch (err) {
    return await updatePinRecord(pinId, {
      status: "failed",
      error_message: err instanceof Error ? err.message : "Unknown error while posting.",
    });
  }
}
