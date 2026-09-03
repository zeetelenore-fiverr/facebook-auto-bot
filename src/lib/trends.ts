/**
 * Trending-topic suggestions for the "what should I make a pin about"
 * moment. Two tiers, both free:
 *  1. Google Trends' unofficial daily-trends RSS feed (no key, no cost,
 *     but undocumented and can change shape or go down without notice).
 *  2. A curated list of evergreen Pinterest-performing niches, always
 *     available, used whenever the feed fails or returns too little.
 */

const EVERGREEN_TOPICS = [
  "cozy home decor ideas",
  "easy weeknight dinner recipes",
  "capsule wardrobe outfits",
  "small space organization hacks",
  "budget travel destinations",
  "DIY home improvement projects",
  "healthy meal prep ideas",
  "minimalist living room design",
  "wedding decor inspiration",
  "self care morning routine",
  "indoor plant care tips",
  "aesthetic workspace setup",
  "quick hairstyles for work",
  "backyard garden ideas",
  "productivity planner layouts",
  "fall fashion outfit ideas",
  "birthday party decoration ideas",
  "skincare routine for glowing skin",
  "kids activities at home",
  "home office decor ideas",
];

export function pickEvergreenTopics(count = 8): string[] {
  const shuffled = [...EVERGREEN_TOPICS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function fetchGoogleTrends(geo: string): Promise<string[]> {
  const res = await fetch(
    `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${encodeURIComponent(geo)}`,
    { signal: AbortSignal.timeout(8_000), next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`Google Trends RSS ${res.status}`);
  const xml = await res.text();

  const titles = [...xml.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)]
    .map((m) => m[1].trim())
    .filter((t) => t && !/daily search trends/i.test(t));

  return [...new Set(titles)];
}

export async function getTrendingTopics(geo = "US"): Promise<{ topics: string[]; source: "trends" | "evergreen" }> {
  try {
    const topics = await fetchGoogleTrends(geo);
    if (topics.length >= 4) {
      return { topics: topics.slice(0, 12), source: "trends" };
    }
  } catch {
    // fall through to evergreen
  }
  return { topics: pickEvergreenTopics(12), source: "evergreen" };
}
