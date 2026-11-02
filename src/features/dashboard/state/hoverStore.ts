import { create } from "zustand";
import type { Period } from "@/domain/types";

/**
 * Ephemeral hover shared between charts (the crosshair). Never written to the
 * URL: hovering is not a selection. Components subscribe to the slice they
 * need so a hover in the heat map only re-renders the time series' marker.
 */
interface HoverState {
  period: Period | null;
  marketId: string | null;
  setHover: (period: Period | null, marketId?: string | null) => void;
  clear: () => void;
}

export const useHoverStore = create<HoverState>((set) => ({
  period: null,
  marketId: null,
  setHover: (period, marketId = null) => set({ period, marketId }),
  clear: () => set({ period: null, marketId: null }),
}));
