"use client";

import { useMemo, useState } from "react";
import { BellIcon, BellRingIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const SEVERITY_CLASS: Record<AlertSeverity, string> = {
  info: "bg-muted text-foreground",
  warning: "bg-status-at-risk-soft text-status-at-risk",
  critical: "bg-status-off-track-soft text-status-off-track",
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
}: {
  period: Period;
  onSelectMarket: (id: string) => void;
  compact?: boolean;
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
    <Card className="gap-2">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <BellIcon className="size-4" aria-hidden />
          Alerts
          {hits && triggered.length ? (
            <Badge
              variant="outline"
              className="border-status-off-track/30 bg-status-off-track-soft text-status-off-track ml-1"
            >
              {triggered.length} triggered · {formatPeriod(period)}
            </Badge>
          ) : null}
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <PlusIcon aria-hidden />
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
      </CardHeader>
      <CardContent className="space-y-2">
        {isPending ? (
          <div className="space-y-2" role="status" aria-label="Loading alerts">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="border-destructive/40 flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
          >
            <span>Could not load alerts: {error.message}</span>
            <Button size="xs" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No alerts yet. Create one to watch a threshold.
          </p>
        ) : (
          <ul className="divide-y">
            {(compact ? triggered : alerts).map((a) => {
              const hitList = hits?.byAlert.get(a.id) ?? [];
              const optimistic = a.id.startsWith("optimistic-");
              return (
                <li
                  key={a.id}
                  className={cn("flex items-start gap-3 py-2", optimistic && "opacity-60")}
                  aria-busy={optimistic}
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                      {hitList.length ? (
                        <BellRingIcon
                          className="text-status-off-track size-3.5"
                          aria-label="Triggered"
                        />
                      ) : (
                        <BellIcon className="text-muted-foreground size-3.5" aria-label="Quiet" />
                      )}
                      {a.name}
                      <span
                        className={cn(
                          "rounded-sm px-1 py-0.5 text-[10px] font-medium uppercase",
                          SEVERITY_CLASS[a.severity],
                        )}
                      >
                        {a.severity}
                      </span>
                      {optimistic ? (
                        <span className="text-muted-foreground text-xs">saving…</span>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground text-xs">{describe(index, a)}</p>
                    {hitList.length ? (
                      <ul className="mt-1 flex flex-wrap gap-1">
                        {hitList.map((h) => (
                          <li key={h.snapshot.market.id}>
                            <button
                              type="button"
                              onClick={() => onSelectMarket(h.snapshot.market.id)}
                              className="bg-status-off-track-soft text-status-off-track rounded-md border px-1.5 py-0.5 text-xs hover:underline"
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
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={a.enabled}
                        disabled={optimistic}
                        aria-label={`${a.enabled ? "Disable" : "Enable"} ${a.name}`}
                        onCheckedChange={(enabled) =>
                          update.mutate({ id: a.id, patch: { enabled } })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={optimistic}
                        aria-label={`Delete ${a.name}`}
                        onClick={() => remove.mutate(a.id)}
                      >
                        <Trash2Icon aria-hidden />
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
            {compact && triggered.length === 0 ? (
              <li className="text-muted-foreground py-2 text-sm">
                No alert is triggered in {formatPeriod(period)}.
              </li>
            ) : null}
          </ul>
        )}
        <p className="text-muted-foreground text-xs">
          Demo persistence: alerts live in server memory, reset on restart and are not shared
          between instances.
        </p>
      </CardContent>
    </Card>
  );
}
