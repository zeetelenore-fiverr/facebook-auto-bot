import { env } from "@/lib/env";
import type { ContentProvider, GeneratedContent } from "@/lib/types";

/**
 * Facebook copy generation across free LLM providers, tried in order until
 * one returns usable JSON.
 *
 * Pollinations is the only keyless option, but its text endpoint now answers
 * `402 Payment Required` for anonymous callers — inside a 200 response body,
 * so the status alone does not reveal it. Groq and Gemini both have free tiers
 * that need nothing but a no-cost API key, so they are preferred whenever one
 * is configured. If every provider fails the caller still gets a postable
 * draft from a deterministic template, but the result says so via `provider`:
 * silently shipping template copy as if it were AI copy is worse than an
 * honest warning.
 */

const SYSTEM_PROMPT = `You are an expert Facebook Page copywriter. Given a topic, write a single
high-performing Facebook photo post in strict JSON with this exact shape and nothing else:
{"title": string, "description": string, "hashtags": string[]}

The three parts are joined into one caption, in that order, so they must read as
one post rather than three fragments.

Rules:
- title: the opening hook, <= 80 characters. Conversational, scroll-stopping, specific. At most one emoji. No hashtags.
- description: 2-4 short sentences, <= 400 characters, written to be read on a phone. Plain language, no marketing cliches. End with a question or a soft call to action that invites comments, since engagement drives Facebook reach.
- hashtags: 3 to 5 short, highly relevant hashtags, lowercase, no "#" symbol, no spaces. Facebook rewards a few precise tags, not a wall of them.
- Output ONLY the JSON object. No markdown fences, no commentary.`;

const TIMEOUT_MS = 20_000;

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object in response");
  return JSON.parse(text.slice(start, end + 1));
}

function parseContent(raw: string): GeneratedContent {
  const parsed = extractJson(raw);
  if (!parsed || typeof parsed !== "object") throw new Error("Malformed generation payload");
  const o = parsed as Record<string, unknown>;
  if (
    typeof o.title !== "string" ||
    typeof o.description !== "string" ||
    !Array.isArray(o.hashtags) ||
    !o.hashtags.every((h) => typeof h === "string")
  ) {
    throw new Error("Malformed generation payload");
  }
  return {
    title: o.title.trim(),
    description: o.description.trim(),
    hashtags: (o.hashtags as string[]).map((h) => h.replace(/^#/, "").trim()).filter(Boolean),
  };
}

/** Shared call shape for the OpenAI-compatible endpoints (Pollinations, Groq). */
async function chatCompletion(
  url: string,
  model: string,
  topic: string,
  apiKey?: string
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Topic: ${topic}` },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const host = new URL(url).host;
  const body = await res.text();
  if (!res.ok) throw new Error(`${host} responded ${res.status}`);

  const data = JSON.parse(body);
  // Pollinations returns quota errors with a 200 status, so the body has to be
  // inspected rather than trusting res.ok.
  if (data?.error) {
    const message = typeof data.error === "string" ? data.error : data.error?.message;
    throw new Error(`${host}: ${message ?? "unknown error"}`);
  }

  const content: unknown = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Empty completion");
  return content;
}

async function geminiCompletion(topic: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: `Topic: ${topic}` }] }],
        generationConfig: { temperature: 0.9, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  );

  if (!res.ok) throw new Error(`gemini responded ${res.status}`);
  const data = await res.json();
  const content: unknown = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof content !== "string" || !content.trim()) throw new Error("Empty completion");
  return content;
}

function template(topic: string): GeneratedContent {
  const clean = topic.trim();
  const words = clean.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
  return {
    title: `${clean} — worth a look today`,
    description: `We put together a few ideas around ${clean.toLowerCase()}. Simple things you can actually try this week. Which one would you start with?`,
    hashtags: [...new Set(words)].concat(["ideas"]).slice(0, 5),
  };
}

type Attempt = { provider: ContentProvider; run: () => Promise<string> };

function providerChain(topic: string): Attempt[] {
  const chain: Attempt[] = [];

  // A configured free-tier key beats the keyless service on both quality and
  // reliability, so those go first whenever one is present.
  // Groq retires model ids without notice (llama-3.3-70b-versatile vanished
  // mid-build), so try a short list rather than pinning a single name.
  const groqKey = env.groqApiKey;
  if (groqKey) {
    for (const model of ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]) {
      chain.push({
        provider: "groq",
        run: () =>
          chatCompletion("https://api.groq.com/openai/v1/chat/completions", model, topic, groqKey),
      });
    }
  }

  const geminiKey = env.geminiApiKey;
  if (geminiKey) {
    chain.push({ provider: "gemini", run: () => geminiCompletion(topic, geminiKey) });
  }

  chain.push({
    provider: "pollinations",
    run: () => chatCompletion("https://text.pollinations.ai/openai", "openai-fast", topic),
  });

  return chain;
}

export async function generateContent(topic: string): Promise<GeneratedContent> {
  const failures: string[] = [];

  for (const { provider, run } of providerChain(topic)) {
    try {
      return { ...parseContent(await run()), provider };
    } catch (err) {
      failures.push(`${provider}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.warn("[generateContent] every provider failed:", failures.join(" | "));
  return { ...template(topic), provider: "template", providerError: failures[0] };
}
