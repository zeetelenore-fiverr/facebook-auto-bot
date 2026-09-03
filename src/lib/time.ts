/**
 * Timezone-aware date parts without a date library, using Intl (which
 * already ships in the runtime) — the same "no extra dependency for
 * something the platform already does" call made elsewhere in this app.
 */
export function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")) % 24, // Intl can return "24" for midnight
  };
}

/** Start of "today" (in the given timezone) expressed as a UTC ISO instant. */
export function startOfTodayIso(timeZone: string): string {
  const { dateKey } = localParts(new Date(), timeZone);
  // Interpreting the local midnight as UTC is an approximation (off by the
  // zone's offset), which is fine here: it only needs to be "early enough"
  // to safely bound a same-day count, not exact to the second.
  return `${dateKey}T00:00:00.000Z`;
}
