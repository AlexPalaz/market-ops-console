"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ViewMode } from "@/domain/types";

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
      variant="outline"
      size="sm"
    >
      <ToggleGroupItem value="exec" aria-label="Executive overview">
        Executive
      </ToggleGroupItem>
      <ToggleGroupItem value="analyst" aria-label="Analyst deep-dive">
        Analyst
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
