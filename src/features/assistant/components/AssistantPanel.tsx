"use client";

import { useEffect, useMemo, useRef } from "react";
import { MessageSquareTextIcon, Trash2Icon } from "lucide-react";
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
      className="bg-card flex h-full min-h-0 flex-col rounded-xl border"
    >
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <MessageSquareTextIcon className="size-4" aria-hidden />
          Assistant
        </h2>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-xs">
            Answers are generated; evidence is from the dataset
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
            <p>
              Ask about performance against forecast, risks, or a specific market. Every answer
              cites the markets, products and periods it used, and says when the data cannot support
              an answer.
            </p>
            <SuggestedQuestions onPick={ask} disabled={isGenerating} />
          </div>
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <p
                key={m.id}
                className="bg-muted ml-8 rounded-lg px-3 py-2 text-sm"
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
