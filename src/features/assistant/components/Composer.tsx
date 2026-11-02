"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { SendHorizonalIcon, SquareIcon } from "lucide-react";
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
    <form onSubmit={submit} className="flex items-end gap-2">
      <label htmlFor="assistant-question" className="sr-only">
        Ask about the portfolio
      </label>
      <textarea
        id="assistant-question"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        placeholder="Ask about markets, regions, products or periods…"
        className="bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 min-h-9 flex-1 resize-none rounded-lg border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-3"
      />
      {isGenerating ? (
        <Button type="button" variant="destructive" onClick={onStop} aria-label="Stop generating">
          <SquareIcon aria-hidden />
          Stop
        </Button>
      ) : (
        <Button type="submit" disabled={!value.trim()} aria-label="Send question">
          <SendHorizonalIcon aria-hidden />
          Ask
        </Button>
      )}
    </form>
  );
}
