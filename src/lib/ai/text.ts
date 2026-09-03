import type { GeneratedContent } from "@/lib/types";

/**
 * Pinterest copy generation via Pollinations' free OpenAI-compatible text
 * endpoint (https://pollinations.ai) — no API key, no signup, no cost.
 * It is a best-effort community service with no uptime SLA, so every call
 * is retried once and falls back to a deterministic template rather than
 * ever throwing — a topic should always produce a postable draft.
 */
const ENDPOINT = "https://text.pollinations.ai/openai";

const SYSTEM_PROMPT = `You are an expert Pinterest SEO copywriter. Given a topic, write a single
high-performing Pinterest pin in strict JSON with this exact shape and nothing else:
{"title": string, "description": string, "hashtags": string[]}

Rules:
- title: <= 100 characters, keyword-rich, specific, curiosity or benefit driven. No hashtags, no emoji spam.
- description: 2-4 sentences, <= 500 characters, natural keyword usage, ends with a soft call to action. No hashtags inside it.
- hashtags: 6 to 10 short, highly relevant Pinterest hashtags, lowercase, no "#" symbol, no spaces.
- Output ONLY the JSON object. No markdown fences, no commentary.`;

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object in response");
  return JSON.parse(text.slice(start, end + 1));
}

function isGeneratedContent(v: unknown): v is GeneratedContent {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.title === "string" &&
    typeof o.description === "string" &&
    Array.isArray(o.hashtags) &&
    o.hashtags.every((h) => typeof h === "string")
  );
}

async function callPollinations(topic: string): Promise<GeneratedContent> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      seed: Math.floor(Math.random() * 1_000_000),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Topic: ${topic}` },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) throw new Error(`Pollinations text API ${res.status}`);
  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(content);
  if (!isGeneratedContent(parsed)) throw new Error("Malformed generation payload");
  return parsed;
}

function fallbackContent(topic: string): GeneratedContent {
  const clean = topic.trim();
  const words = clean
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
  return {
    title: `${clean} — Ideas & Inspiration You'll Love`,
    description: `Looking for ${clean.toLowerCase()} inspiration? Save this pin for fresh ideas, tips, and inspiration you can use today. Tap to explore more.`,
    hashtags: [...new Set(words)].concat(["inspiration", "ideas"]).slice(0, 8),
  };
}

export async function generateContent(topic: string): Promise<GeneratedContent> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callPollinations(topic);
    } catch {
      // try once more, then fall back
    }
  }
  return fallbackContent(topic);
}
