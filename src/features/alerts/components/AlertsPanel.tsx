"use client";

import { useMemo, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Section } from "@/components/shared/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useData } from "@/data/DataProvider";
import { formatPeriod } from "@/domain/format";
import { evaluateAlerts } from "@/domain/selectors";
import type { Period } from "@/domain/types";
import { cn } from "@/lib/utils";
import { useAlerts, useCreateAlert, useDeleteAlert, useUpdateAlert } from "../hooks/useAlerts";
import type { Alert, AlertSeverity } from "../schemas/alertSchema";
import { AlertForm } from "./AlertForm";

const SEVERITY_VARIANT: Record<AlertSeverity, "outline" | "warning" | "destructive"> = {
  info: "outline",
  warning: "warning",
  critical: "destructive",
};

function describe(index: ReturnType<typeof useData>, a: Alert): string {
  const where =
    a.scope === "portfolio"
      ? "any market"
      : a.scope === "region"
        ? `markets in ${index.regionsById.get(a.targetId ?? "")?.name ?? a.targetId}`
        : (index.marketsById.get(a.targetId ?? "")?.name ?? a.targetId);
  const conds = [
    a.growthBelowPct !== undefined ? `growth < ${a.growthBelowPct}%` : null,
    a.attainmentBelowPct !== undefined ? `attainment < ${a.attainmentBelowPct}%` : null,
  ].filter(Boolean);
  return `${where} · ${conds.join(" or ")}`;
}

/**
 * Alert rules with live evaluation against the selected period. Create is a
 * schema-validated dialog; toggles and deletes are optimistic with rollback.
 */
export function AlertsPanel({
  period,
  onSelectMarket,
  compact = false,
  index: sectionIndex,
}: {
  period: Period;
  onSelectMarket: (id: string) => void;
  compact?: boolean;
  index?: string;
}) {
  const index = useData();
  const { data: alerts, isPending, isError, error, refetch } = useAlerts();
  const create = useCreateAlert();
  const update = useUpdateAlert();
  const remove = useDeleteAlert();
  const [open, setOpen] = useState(false);

  const hits = useMemo(
    () => (alerts ? evaluateAlerts(index, alerts, period) : null),
    [index, alerts, period],
  );
  const triggered = alerts?.filter((a) => hits?.byAlert.has(a.id)) ?? [];

  return (
    <Section
      title="Alerts"
      index={sectionIndex}
      description={
        hits && triggered.length
          ? `${triggered.length} rule${triggered.length > 1 ? "s" : ""} triggered in ${formatPeriod(period)}.`
          : `No rule is triggered in ${formatPeriod(period)}.`
      }
      minHeight={0}
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <PlusIcon aria-hidden strokeWidth={1.75} />
              New alert
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New alert</DialogTitle>
              <DialogDescription>
                Flag markets whose growth or forecast attainment falls below a threshold. Saved
                optimistically; rolled back if the service rejects it.
              </DialogDescription>
            </DialogHeader>
            <AlertForm
              submitting={create.isPending}
              onCancel={() => setOpen(false)}
              onSubmit={(values) => {
                setOpen(false);
                create.mutate(values);
              }}
            />
          </DialogContent>
        </Dialog>
      }
    >
      {isPending ? (
        <div className="space-y-3 py-1" role="status" aria-label="Loading alerts">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="border-rule flex items-center justify-between gap-2 border-b py-3 text-[13px]"
        >
          <span>Could not load alerts: {error.message}</span>
          <Button size="xs" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : alerts.length === 0 ? (
        <p className="text-ink-soft py-2 text-[12.5px]">
          No alerts yet. Create one to watch a threshold.
        </p>
      ) : (
        <ul>
          {(compact ? triggered : alerts).map((a) => {
            const hitList = hits?.byAlert.get(a.id) ?? [];
            const optimistic = a.id.startsWith("optimistic-");
            return (
              <li
                key={a.id}
                className={cn(
                  "border-rule flex items-start gap-3 border-b py-3 last:border-b-0",
                  optimistic && "opacity-60",
                )}
                aria-busy={optimistic}
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    hitList.length ? "bg-status-off-track" : "bg-rule",
                  )}
                  aria-label={hitList.length ? "Triggered" : "Quiet"}
                  role="img"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-ink flex flex-wrap items-center gap-2 text-[13.5px] font-medium">
                    {a.name}
                    <Badge variant={SEVERITY_VARIANT[a.severity]}>{a.severity}</Badge>
                    {optimistic ? <span className="eyebrow">saving…</span> : null}
                  </p>
                  <p className="numeral text-ink-soft text-[12px]">{describe(index, a)}</p>
                  {hitList.length ? (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {hitList.map((h) => (
                        <li key={h.snapshot.market.id}>
                          <button
                            type="button"
                            onClick={() => onSelectMarket(h.snapshot.market.id)}
                            className="border-rule text-ink hover:border-ink/40 hover:bg-muted/60 focus-visible:ring-ring rounded-sm border px-1.5 py-0.5 text-[12px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
                            title={h.reasons.join("; ")}
                          >
                            {h.snapshot.market.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {!compact ? (
                  <div className="flex items-center gap-2">
                    <Switch
                      size="sm"
                      checked={a.enabled}
                      disabled={optimistic}
                      aria-label={`${a.enabled ? "Disable" : "Enable"} ${a.name}`}
                      onCheckedChange={(enabled) => update.mutate({ id: a.id, patch: { enabled } })}
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={optimistic}
                      aria-label={`Delete ${a.name}`}
                      onClick={() => remove.mutate(a.id)}
                    >
                      <Trash2Icon aria-hidden strokeWidth={1.75} />
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
          {compact && triggered.length === 0 ? (
            <li className="text-ink-soft py-2 text-[12.5px]">
              No alert is triggered in {formatPeriod(period)}.
            </li>
          ) : null}
        </ul>
      )}
      <p className="text-ink-soft mt-3 text-[11.5px]">
        Demo persistence: alerts live in server memory, reset on restart and are not shared between
        instances.
      </p>
    </Section>
  );
}
