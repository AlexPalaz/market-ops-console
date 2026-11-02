import { randomUUID } from "node:crypto";
import type { Alert, AlertInput } from "../schemas/alertSchema";

/**
 * Mock persistence for the assignment. State lives in this module's memory:
 * it resets when the server restarts and is not shared between serverless
 * instances. This is documented in the UI and README; it is not a backend.
 */
const LATENCY_MS = 450;

const store = new Map<string, Alert>();

function seed() {
  if (store.size) return;
  const seeds: Omit<Alert, "id" | "createdAt">[] = [
    {
      name: "Any market shrinking",
      scope: "portfolio",
      growthBelowPct: 0,
      severity: "critical",
      enabled: true,
    },
    {
      name: "Europe under plan",
      scope: "region",
      targetId: "eu",
      attainmentBelowPct: 95,
      severity: "warning",
      enabled: true,
    },
  ];
  for (const s of seeds) {
    const id = randomUUID();
    store.set(id, { ...s, id, createdAt: new Date(0).toISOString() });
  }
}
seed();

export class MockPersistenceError extends Error {
  constructor() {
    super("Simulated persistence failure: the alert service rejected the write.");
    this.name = "MockPersistenceError";
  }
}

const delay = () => new Promise((r) => setTimeout(r, LATENCY_MS));

/** Deterministic failure hook: any name starting with "fail" is rejected. */
const shouldFail = (name: string | undefined) =>
  (name ?? "").trim().toLowerCase().startsWith("fail");

export async function listAlerts(): Promise<Alert[]> {
  await delay();
  return [...store.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createAlert(input: AlertInput): Promise<Alert> {
  await delay();
  if (shouldFail(input.name)) throw new MockPersistenceError();
  const alert: Alert = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  store.set(alert.id, alert);
  return alert;
}

export async function updateAlert(id: string, patch: Partial<AlertInput>): Promise<Alert | null> {
  await delay();
  const current = store.get(id);
  if (!current) return null;
  if (shouldFail(patch.name ?? current.name)) throw new MockPersistenceError();
  const next: Alert = { ...current, ...patch };
  store.set(id, next);
  return next;
}

export async function deleteAlert(id: string): Promise<boolean> {
  await delay();
  return store.delete(id);
}
