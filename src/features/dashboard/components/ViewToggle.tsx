"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ViewMode } from "@/domain/types";

/** Executive / Analyst as underline tabs. */
export function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v === "exec" || v === "analyst") onChange(v);
      }}
      aria-label="Audience view"
      variant="default"
      size="sm"
      className="h-14 border-b-0"
    >
      <ToggleGroupItem value="exec" aria-label="Executive overview" className="h-14">
        Executive
      </ToggleGroupItem>
      <ToggleGroupItem value="analyst" aria-label="Analyst deep-dive" className="h-14">
        Analyst
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
