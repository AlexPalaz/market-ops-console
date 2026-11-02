"use client";

import { useEffect, useMemo, useRef } from "react";
import { SparklesIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResolvedCitation } from "@/domain/selectors";
import { useChatStream } from "../hooks/useChatStream";
import { useChatStore } from "../store/chatStore";
import { AnswerMessage } from "./AnswerMessage";
import { Composer } from "./Composer";
import { SuggestedQuestions } from "./SuggestedQuestions";

/**
 * The conversational surface. Subscribes to chat state only; the dashboard
 * does not rerender while tokens stream. Announces state changes (not every
 * token) through one polite live region.
 */
export function AssistantPanel({
  onFollowCitation,
}: {
  onFollowCitation: (c: ResolvedCitation) => void;
}) {
  const messages = useChatStore((s) => s.messages);
  const clear = useChatStore((s) => s.clear);
  const { ask, stop, isGenerating } = useChatStream();
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the newest content in view while streaming.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const lastAnswer = useMemo(
    () => messages.filter((m) => m.role === "assistant").at(-1),
    [messages],
  );
  const liveText = !lastAnswer
    ? ""
    : lastAnswer.status === "streaming"
      ? "Generating an answer."
      : lastAnswer.status === "done"
        ? `Answer ready. ${lastAnswer.confidence ?? ""} confidence, ${lastAnswer.citations.length} citations.`
        : lastAnswer.status === "stopped"
          ? "Generation stopped. The partial answer was kept."
          : `The assistant failed: ${lastAnswer.error ?? "unknown error"}.`;

  return (
    <section
      aria-label="Assistant"
      className="bg-card flex h-full min-h-0 flex-col rounded-xl border shadow-[0_1px_2px_oklch(0.2_0.02_260/0.05),0_2px_8px_-4px_oklch(0.2_0.02_260/0.08)]"
    >
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span
            aria-hidden
            className="from-primary text-primary-foreground flex size-6 items-center justify-center rounded-md bg-gradient-to-br to-[oklch(0.6_0.18_320)]"
          >
            <SparklesIcon className="size-3.5" />
          </span>
          Assistant
          <span className="text-muted-foreground rounded-full border px-1.5 py-px text-[10px] font-medium whitespace-nowrap">
            mock
          </span>
        </h2>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground hidden text-[11px] xl:inline">
            Generated answers · verified evidence
          </span>
          {messages.length ? (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={clear}
              disabled={isGenerating}
              aria-label="Clear conversation"
            >
              <Trash2Icon aria-hidden />
            </Button>
          ) : null}
        </div>
      </header>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
        role="log"
        aria-label="Conversation"
      >
        {messages.length === 0 ? (
          <div className="text-muted-foreground flex h-full flex-col justify-center gap-3 text-sm">
            <p className="from-primary bg-gradient-to-r to-[oklch(0.6_0.18_320)] bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
              Ask the data.
            </p>
            <p>
              Performance against forecast, risks, a specific market. Every answer cites the
              markets, products and periods it used, and says when the data cannot support an
              answer.
            </p>
            <SuggestedQuestions onPick={ask} disabled={isGenerating} />
          </div>
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <p
                key={m.id}
                className="bg-primary text-primary-foreground ml-10 rounded-2xl rounded-tr-md px-3.5 py-2 text-sm shadow-sm"
                aria-label="Your question"
              >
                {m.text}
              </p>
            ) : (
              <AnswerMessage
                key={m.id}
                message={m}
                onFollowCitation={onFollowCitation}
                onRetry={ask}
              />
            ),
          )
        )}
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveText}
      </div>

      <footer className="space-y-2 border-t px-3 py-2">
        {messages.length > 0 ? <SuggestedQuestions onPick={ask} disabled={isGenerating} /> : null}
        <Composer onSend={ask} onStop={stop} isGenerating={isGenerating} />
      </footer>
    </section>
  );
}
