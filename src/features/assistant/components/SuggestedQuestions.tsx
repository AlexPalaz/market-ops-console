"use client";

import { Button } from "@/components/ui/button";

/** The questions the assignment names, plus the fixtures' awkward cases. */
export const SUGGESTED_QUESTIONS: readonly { label: string; question: string; tone?: "muted" }[] = [
  { label: "Markets at risk", question: "Which markets are at risk this quarter, and why?" },
  { label: "Germany's dip", question: "Why did Germany's revenue dip in March 2026?" },
  {
    label: "APAC vs Europe",
    question: "Compare APAC and Europe on growth and forecast attainment",
  },
  { label: "Forecast miss", question: "What's driving the portfolio's forecast miss?" },
  { label: "Full summary", question: "Give me a full portfolio summary" },
  { label: "Next year?", question: "What will sales be next year?", tone: "muted" },
  { label: "Simulate error", question: "force error", tone: "muted" },
];

export function SuggestedQuestions({
  onPick,
  disabled,
}: {
  onPick: (q: string) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Suggested questions">
      {SUGGESTED_QUESTIONS.map((s) => (
        <li key={s.label}>
          <Button
            variant={s.tone === "muted" ? "ghost" : "outline"}
            size="xs"
            disabled={disabled}
            onClick={() => onPick(s.question)}
            title={s.question}
            className={s.tone === "muted" ? "text-muted-foreground" : undefined}
          >
            {s.label}
          </Button>
        </li>
      ))}
    </ul>
  );
}
