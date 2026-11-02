"use client";

import {
  BanIcon,
  CircleAlertIcon,
  Loader2Icon,
  OctagonXIcon,
  RotateCcwIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResolvedCitation } from "@/domain/selectors";
import { cn } from "@/lib/utils";
import type { AssistantMessage } from "../store/chatStore";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { EvidencePanel } from "./EvidencePanel";

/**
 * One AI answer. The generated prose sits on the AI surface with an explicit
 * "Generated analysis" label; the evidence block below it is dataset output.
 * Text is rendered as plain text: there is no HTML or Markdown path.
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
        "border-ai-border bg-ai-surface rounded-2xl rounded-tl-md border p-3.5",
        status === "error" && "border-destructive/40",
      )}
    >
      <header className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-ai-foreground inline-flex items-center gap-1 font-semibold">
          <SparklesIcon className="size-3.5" aria-hidden />
          Generated analysis
        </span>
        {status === "streaming" ? (
          <span className="text-muted-foreground inline-flex items-center gap-1">
            <Loader2Icon className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
            Generating…
          </span>
        ) : null}
        {status === "stopped" ? (
          <span className="text-muted-foreground inline-flex items-center gap-1">
            <BanIcon className="size-3.5" aria-hidden />
            Stopped by you · partial answer
          </span>
        ) : null}
        {status === "done" && confidence ? <ConfidenceBadge confidence={confidence} /> : null}
      </header>

      {status === "error" ? (
        <div role="alert" className="flex items-start gap-2 text-sm">
          <OctagonXIcon className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="flex-1">
            <p className="font-medium">The assistant could not answer.</p>
            <p className="text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="xs"
              className="mt-2"
              onClick={() => onRetry(message.question)}
            >
              <RotateCcwIcon aria-hidden />
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <>
          {status === "done" && isAbstain ? (
            <p className="bg-background mb-2 flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium">
              <CircleAlertIcon className="text-status-at-risk size-3.5" aria-hidden />
              Can&apos;t be answered from this dataset
            </p>
          ) : null}
          {status === "done" && kind === "low_confidence" ? (
            <p className="bg-background mb-2 flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium">
              <CircleAlertIcon className="text-status-at-risk size-3.5" aria-hidden />
              Directional only: the data does not fully support this
            </p>
          ) : null}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {text}
            {status === "streaming" ? (
              <span
                className="bg-foreground ml-0.5 inline-block h-4 w-0.5 animate-pulse align-text-bottom motion-reduce:animate-none"
                aria-hidden
              />
            ) : null}
          </p>
          {status === "done" && !isAbstain ? (
            <div className="mt-3">
              <EvidencePanel citations={citations} onFollow={onFollowCitation} />
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}
