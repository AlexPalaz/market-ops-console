"use client";

import { RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResolvedCitation } from "@/domain/selectors";
import { cn } from "@/lib/utils";
import type { AssistantMessage } from "../store/chatStore";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { EvidencePanel } from "./EvidencePanel";

/**
 * One AI answer. Generated prose sits on the paper behind a signal rule with a
 * "Generated" eyebrow; the evidence block below it is dataset output. Text is
 * rendered as plain text: there is no HTML or Markdown path.
 */
export function AnswerMessage({
  message,
  onFollowCitation,
  onRetry,
}: {
  message: AssistantMessage;
  onFollowCitation: (c: ResolvedCitation) => void;
  onRetry: (question: string) => void;
}) {
  const { status, text, kind, confidence, citations, error } = message;
  const isAbstain = kind === "abstain";

  return (
    <article
      aria-label="Assistant answer"
      aria-busy={status === "streaming"}
      className={cn(
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 border-l-2 pl-3.5 motion-safe:duration-200",
        status === "error" ? "border-status-off-track" : "border-signal",
      )}
    >
      <header className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="eyebrow text-signal-ink">Generated</span>
        {status === "streaming" ? (
          <span className="eyebrow inline-flex items-center gap-1.5">
            <span
              className="bg-signal size-1.5 rounded-full motion-safe:animate-pulse"
              aria-hidden
            />
            Generating…
          </span>
        ) : null}
        {status === "stopped" ? (
          <span className="eyebrow">Stopped by you · partial answer</span>
        ) : null}
        {status === "done" && confidence ? <ConfidenceBadge confidence={confidence} /> : null}
      </header>

      {status === "error" ? (
        <div role="alert" className="text-[13.5px]">
          <p className="text-ink font-medium">The assistant could not answer.</p>
          <p className="text-ink-soft">{error}</p>
          <Button
            variant="outline"
            size="xs"
            className="mt-2"
            onClick={() => onRetry(message.question)}
          >
            <RotateCcwIcon aria-hidden strokeWidth={1.75} />
            Retry
          </Button>
        </div>
      ) : (
        <>
          {status === "done" && isAbstain ? (
            <p className="eyebrow text-status-at-risk mb-1.5 tracking-normal normal-case">
              Can&apos;t be answered from this dataset
            </p>
          ) : null}
          {status === "done" && kind === "low_confidence" ? (
            <p className="eyebrow text-status-at-risk mb-1.5 tracking-normal normal-case">
              Directional only: the data does not fully support this
            </p>
          ) : null}
          <p className="text-ink text-[14px] leading-[1.55] whitespace-pre-wrap">
            {text}
            {status === "streaming" ? (
              <span
                className="bg-signal ml-0.5 inline-block h-[1em] w-[2px] translate-y-0.5 motion-safe:animate-pulse"
                aria-hidden
              />
            ) : null}
          </p>
          {status === "done" && !isAbstain ? (
            <EvidencePanel citations={citations} onFollow={onFollowCitation} />
          ) : null}
        </>
      )}
    </article>
  );
}
