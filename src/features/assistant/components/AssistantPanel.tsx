"use client";

import { useEffect, useMemo, useRef } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResolvedCitation } from "@/domain/selectors";
import { useChatStream } from "../hooks/useChatStream";
import { useChatStore } from "../store/chatStore";
import { AnswerMessage } from "./AnswerMessage";
import { Composer } from "./Composer";
import { SuggestedQuestions } from "./SuggestedQuestions";

/**
 * The conversational surface: the one contained panel on the page. Subscribes
 * to chat state only; the dashboard does not rerender while tokens stream.
 * Announces state changes (not every token) through one polite live region.
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
      className="border-ink/20 bg-surface flex h-full min-h-0 flex-col rounded-lg border"
    >
      <header className="border-rule flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="flex items-baseline gap-2.5">
          <span className="text-ink inline-flex items-center gap-2 text-[15px] font-medium">
            <span className="bg-signal size-2 rounded-sm" aria-hidden />
            Assistant
          </span>
          <span className="eyebrow whitespace-nowrap">mock</span>
        </h2>
        <div className="flex items-center gap-2">
          {messages.length ? (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={clear}
              disabled={isGenerating}
              aria-label="Clear conversation"
            >
              <Trash2Icon aria-hidden strokeWidth={1.75} />
            </Button>
          ) : null}
        </div>
      </header>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4"
        role="log"
        aria-label="Conversation"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-end gap-4 pb-2">
            <p className="display text-ink text-[30px] leading-none font-medium">Ask the data.</p>
            <p className="text-ink-soft max-w-prose text-[13.5px]">
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
                className="bg-ink text-paper ml-10 rounded-md px-3.5 py-2 text-[13.5px]"
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

      <footer className="border-rule space-y-3 border-t px-4 py-3">
        {messages.length > 0 ? <SuggestedQuestions onPick={ask} disabled={isGenerating} /> : null}
        <Composer onSend={ask} onStop={stop} isGenerating={isGenerating} />
      </footer>
    </section>
  );
}
