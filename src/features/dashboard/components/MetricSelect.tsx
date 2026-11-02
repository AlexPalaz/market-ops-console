"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { METRIC_KEYS, type MetricKey } from "@/domain/types";
import { METRICS } from "@/lib/metrics";

export function MetricSelect({
  value,
  onChange,
  label = "Colour by",
}: {
  value: MetricKey;
  onChange: (m: MetricKey) => void;
  label?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if ((METRIC_KEYS as readonly string[]).includes(v)) onChange(v as MetricKey);
      }}
    >
      <SelectTrigger size="sm" aria-label={label} className="w-[10.5rem]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {METRIC_KEYS.map((k) => (
          <SelectItem key={k} value={k}>
            {METRICS[k].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
