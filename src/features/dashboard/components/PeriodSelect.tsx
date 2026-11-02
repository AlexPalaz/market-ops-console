"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/data/DataProvider";
import { formatPeriod } from "@/domain/format";
import type { Period } from "@/domain/types";

export function PeriodSelect({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  const index = useData();
  const periods = [...index.periods].reverse();
  return (
    <Select value={value} onValueChange={(v) => onChange(v)}>
      <SelectTrigger size="sm" aria-label="Period" className="numeral w-[11rem] text-[12.5px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {periods.map((p) => (
          <SelectItem key={p} value={p} className="numeral text-[12.5px]">
            {formatPeriod(p)}
            {p === index.latestPeriod ? " · latest" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
