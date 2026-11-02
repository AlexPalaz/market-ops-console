"use client";

import { useMemo } from "react";
import { useData } from "@/data/DataProvider";
import { evaluateAlerts } from "@/domain/selectors";
import type { Period } from "@/domain/types";
import { useAlerts } from "./useAlerts";

const EMPTY = { byMarket: new Map(), byAlert: new Map() } as ReturnType<typeof evaluateAlerts>;

/** Alerts evaluated against the dataset for a period; empty until loaded. */
export function useAlertHits(period: Period) {
  const index = useData();
  const { data } = useAlerts();
  return useMemo(() => (data ? evaluateAlerts(index, data, period) : EMPTY), [index, data, period]);
}
