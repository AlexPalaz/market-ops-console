"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DataIndex } from "@/domain/dataIndex";
import { dataIndex as defaultIndex } from "@/data";

const DataContext = createContext<DataIndex>(defaultIndex);

/** Lets tests and stories inject a different dataset; the app uses the default. */
export function DataProvider({ index, children }: { index: DataIndex; children: ReactNode }) {
  return <DataContext.Provider value={index}>{children}</DataContext.Provider>;
}

export function useData(): DataIndex {
  return useContext(DataContext);
}
