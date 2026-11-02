"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Composer({
  onSend,
  onStop,
  isGenerating,
}: {
  onSend: (q: string) => void;
  onStop: () => void;
  isGenerating: boolean;
}) {
  const [value, setValue] = useState("");
  const inputId = useId();

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const q = value.trim();
    if (!q || isGenerating) return;
    onSend(q);
    setValue("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={submit}
      className="border-rule bg-paper focus-within:border-ink/50 flex items-end gap-2 rounded-md border p-1.5 transition-colors"
    >
      <label htmlFor={inputId} className="sr-only">
        Ask about the portfolio
      </label>
      <textarea
        id={inputId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        placeholder="Ask about markets, regions, products or periods…"
        className="text-ink placeholder:text-ink-soft/80 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-[13.5px] outline-none"
      />
      {isGenerating ? (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onStop}
          aria-label="Stop generating"
        >
          <SquareIcon aria-hidden className="size-3" strokeWidth={2.5} />
        </Button>
      ) : (
        <Button
          type="submit"
          variant="signal"
          size="icon-sm"
          disabled={!value.trim()}
          aria-label="Send question"
        >
          <ArrowUpIcon aria-hidden strokeWidth={2.25} />
        </Button>
      )}
    </form>
  );
}
