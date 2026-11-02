"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { alertListSchema, alertSchema, type Alert, type AlertInput } from "../schemas/alertSchema";

export const ALERTS_KEY = ["alerts"] as const;

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function fetchAlerts(): Promise<Alert[]> {
  const res = await fetch("/api/alerts", { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res));
  return alertListSchema.parse(await res.json());
}

async function postAlert(input: AlertInput): Promise<Alert> {
  const res = await fetch("/api/alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  return alertSchema.parse(await res.json());
}

async function patchAlert(id: string, patch: Partial<AlertInput>): Promise<Alert> {
  const res = await fetch(`/api/alerts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
  return alertSchema.parse(await res.json());
}

async function removeAlert(id: string): Promise<void> {
  const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await readError(res));
}

/** Server state for alerts. The query is the single cache every view reads. */
export function useAlerts() {
  return useQuery({ queryKey: ALERTS_KEY, queryFn: fetchAlerts });
}

/**
 * Optimistic mutations: the cache is updated before the request, snapshotted
 * for rollback, restored on failure, and reconciled with the server on settle.
 */
export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postAlert,
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ALERTS_KEY });
      const previous = qc.getQueryData<Alert[]>(ALERTS_KEY) ?? [];
      const optimistic: Alert = {
        ...input,
        id: `optimistic-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<Alert[]>(ALERTS_KEY, [...previous, optimistic]);
      return { previous, optimisticId: optimistic.id };
    },
    onError: (err, _input, ctx) => {
      if (ctx) qc.setQueryData(ALERTS_KEY, ctx.previous);
      toast.error("Alert not saved", { description: err.message });
    },
    onSuccess: (saved, _input, ctx) => {
      qc.setQueryData<Alert[]>(ALERTS_KEY, (list) =>
        (list ?? []).map((a) => (a.id === ctx?.optimisticId ? saved : a)),
      );
      toast.success("Alert saved", { description: saved.name });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ALERTS_KEY }),
  });
}

export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AlertInput> }) =>
      patchAlert(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ALERTS_KEY });
      const previous = qc.getQueryData<Alert[]>(ALERTS_KEY) ?? [];
      qc.setQueryData<Alert[]>(
        ALERTS_KEY,
        previous.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx) qc.setQueryData(ALERTS_KEY, ctx.previous);
      toast.error("Change not saved", { description: err.message });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ALERTS_KEY }),
  });
}

export function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeAlert,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ALERTS_KEY });
      const previous = qc.getQueryData<Alert[]>(ALERTS_KEY) ?? [];
      qc.setQueryData<Alert[]>(
        ALERTS_KEY,
        previous.filter((a) => a.id !== id),
      );
      return { previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx) qc.setQueryData(ALERTS_KEY, ctx.previous);
      toast.error("Alert not deleted", { description: err.message });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ALERTS_KEY }),
  });
}
