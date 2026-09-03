"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Sparkle,
  ArrowClockwise,
  FloppyDisk,
  Rocket,
  CalendarPlus,
  X,
  WarningCircle,
  CheckCircle,
} from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BoardCache, GeneratedContent, ImageSource, ImageSourcePref } from "@/lib/types";

type Step = "idle" | "generating" | "ready";

export default function GeneratePage() {
  const [topic, setTopic] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [imagePref, setImagePref] = useState<ImageSourcePref>("ai");

  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [image, setImage] = useState<{ url: string; source: ImageSource } | null>(null);
  const [hashtagInput, setHashtagInput] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");

  const [boards, setBoards] = useState<BoardCache[]>([]);
  const [boardId, setBoardId] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState<"draft" | "schedule" | "post_now" | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trends")
      .then((r) => r.json())
      .then((d) => setSuggestions(d.topics ?? []))
      .catch(() => {});

    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setImagePref(d.image_source ?? "ai"))
      .catch(() => {});

    fetch("/api/pinterest/boards")
      .then((r) => r.json())
      .then((d) => {
        setBoards(d.boards ?? []);
        if (d.defaultBoardId) setBoardId(d.defaultBoardId);
      })
      .catch(() => {});
  }, []);

  const selectedBoard = useMemo(() => boards.find((b) => b.board_id === boardId), [boards, boardId]);

  async function generate() {
    if (topic.trim().length < 2) {
      setError("Enter a topic first — at least a couple of words.");
      return;
    }
    setError(null);
    setSuccess(null);
    setStep("generating");
    setContent(null);
    setImage(null);

    try {
      const [contentRes, imageRes] = await Promise.all([
        fetch("/api/generate/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic }),
        }),
        fetch("/api/generate/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: topic, source: imagePref }),
        }),
      ]);

      if (!contentRes.ok) throw new Error((await contentRes.json()).error ?? "Content generation failed.");
      if (!imageRes.ok) throw new Error((await imageRes.json()).error ?? "Image generation failed.");

      const contentData: GeneratedContent = await contentRes.json();
      const imageData: { url: string; source: ImageSource } = await imageRes.json();

      setContent(contentData);
      setImage(imageData);
      setStep("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("idle");
    }
  }

  function removeHashtag(tag: string) {
    if (!content) return;
    setContent({ ...content, hashtags: content.hashtags.filter((h) => h !== tag) });
  }

  function addHashtag() {
    const tag = hashtagInput.trim().replace(/^#/, "").toLowerCase();
    if (!tag || !content || content.hashtags.includes(tag)) return;
    setContent({ ...content, hashtags: [...content.hashtags, tag] });
    setHashtagInput("");
  }

  async function save(action: "draft" | "schedule" | "post_now") {
    if (!content || !image) return;
    if (action !== "draft" && !boardId) {
      setError("Choose a board before scheduling or posting.");
      return;
    }
    if (action === "schedule" && !scheduledAt) {
      setError("Pick a date and time to schedule this pin.");
      return;
    }

    setError(null);
    setSaving(action);
    try {
      const res = await fetch("/api/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          title: content.title,
          description: content.description,
          hashtags: content.hashtags,
          imageUrl: image.url,
          imageSource: image.source,
          destinationUrl: destinationUrl || undefined,
          boardId: boardId || selectedBoard?.board_id || "unset",
          boardName: selectedBoard?.name ?? "Unset",
          action,
          scheduledAt: action === "schedule" ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save pin.");

      if (action === "post_now" && data.pin.status === "failed") {
        throw new Error(data.pin.error_message ?? "Pinterest rejected this pin.");
      }

      setSuccess(
        action === "draft"
          ? "Saved as a draft."
          : action === "schedule"
            ? "Pin scheduled."
            : "Posted to Pinterest 🎉"
      );
      setStep("idle");
      setContent(null);
      setImage(null);
      setTopic("");
      setScheduleOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pin.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <label className="text-sm font-semibold text-foreground">Topic</label>
        <p className="mt-1 text-sm text-muted-foreground">
          What should this pin be about? Be specific for better results.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="e.g. cozy fall living room decor ideas"
            className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
          <select
            value={imagePref}
            onChange={(e) => setImagePref(e.target.value as ImageSourcePref)}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            aria-label="Image source"
          >
            <option value="ai">AI-generated image</option>
            <option value="stock">Free stock photo</option>
            <option value="mixed">Mix of both</option>
          </select>
          <Button onClick={generate} disabled={step === "generating"}>
            <Sparkle size={16} weight="fill" />
            {step === "generating" ? "Generating…" : "Generate"}
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="mt-1 text-xs font-medium text-muted-foreground">Trending ideas:</span>
            {suggestions.slice(0, 8).map((s) => (
              <button
                key={s}
                onClick={() => setTopic(s)}
                className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
          <WarningCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 p-3.5 text-sm text-success">
          <CheckCircle size={18} className="mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      {step === "generating" && (
        <Card className="animate-pulse">
          <div className="grid gap-6 md:grid-cols-[320px_1fr]">
            <div className="aspect-2/3 rounded-xl bg-surface-2" />
            <div className="space-y-3">
              <div className="h-6 w-3/4 rounded bg-surface-2" />
              <div className="h-4 w-full rounded bg-surface-2" />
              <div className="h-4 w-5/6 rounded bg-surface-2" />
              <div className="h-4 w-2/3 rounded bg-surface-2" />
            </div>
          </div>
        </Card>
      )}

      {step === "ready" && content && image && (
        <Card>
          <div className="grid gap-6 md:grid-cols-[320px_1fr]">
            <div>
              <div className="relative aspect-2/3 overflow-hidden rounded-xl bg-surface-2">
                <Image src={image.url} alt={content.title} fill unoptimized className="object-cover" />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Badge>{image.source === "ai" ? "AI generated" : "Stock photo"}</Badge>
                <button
                  onClick={generate}
                  className="flex cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
                >
                  <ArrowClockwise size={13} /> Regenerate
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Title</label>
                <input
                  value={content.title}
                  maxLength={100}
                  onChange={(e) => setContent({ ...content, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <textarea
                  value={content.description}
                  maxLength={500}
                  rows={3}
                  onChange={(e) => setContent({ ...content, description: e.target.value })}
                  className="mt-1 w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Hashtags</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {content.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
                    >
                      #{tag}
                      <button onClick={() => removeHashtag(tag)} aria-label={`Remove ${tag}`} className="cursor-pointer">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  <input
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHashtag())}
                    placeholder="add tag…"
                    className="w-24 rounded-full border border-dashed border-border bg-transparent px-2.5 py-1 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Destination link (optional)</label>
                <input
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://your-site.com/post"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Board</label>
                <select
                  value={boardId}
                  onChange={(e) => setBoardId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option value="">Select a board…</option>
                  {boards.map((b) => (
                    <option key={b.board_id} value={b.board_id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {boards.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    No boards found. Connect Pinterest from Settings first.
                  </p>
                )}
              </div>

              {scheduleOpen && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Schedule for</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="secondary" onClick={() => save("draft")} disabled={saving !== null}>
                  <FloppyDisk size={16} /> Save draft
                </Button>
                {scheduleOpen ? (
                  <Button variant="secondary" onClick={() => save("schedule")} disabled={saving !== null}>
                    <CalendarPlus size={16} /> {saving === "schedule" ? "Scheduling…" : "Confirm schedule"}
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => setScheduleOpen(true)} disabled={saving !== null}>
                    <CalendarPlus size={16} /> Schedule
                  </Button>
                )}
                <Button onClick={() => save("post_now")} disabled={saving !== null}>
                  <Rocket size={16} weight="fill" /> {saving === "post_now" ? "Posting…" : "Post now"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
