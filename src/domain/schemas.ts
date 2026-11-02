import { z } from "zod";
import type { Citation, Dataset, Fixtures, StreamEvent } from "./types";

/** `YYYY-MM` with a valid month. */
export const periodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM");

export const statusSchema = z.enum(["on_track", "at_risk", "off_track"]);
export const confidenceSchema = z.enum(["high", "medium", "low"]);
export const answerKindSchema = z.enum(["normal", "low_confidence", "abstain", "error"]);
export const metricKeySchema = z.enum([
  "revenue",
  "growthPct",
  "forecastAttainmentPct",
  "sharePct",
]);
export const viewModeSchema = z.enum(["exec", "analyst"]);

const idSchema = z.string().min(1);

export const anomalySchema = z.object({
  period: periodSchema,
  type: z.string(),
  note: z.string(),
});

export const marketKpisSchema = z.object({
  revenue: z.number(),
  growthPct: z.number(),
  sharePct: z.number(),
  forecastAttainmentPct: z.number(),
  status: statusSchema,
  anomalies: z.array(anomalySchema),
});

export const marketSchema = z.object({
  id: idSchema,
  name: z.string(),
  iso3: z.string().length(3),
  iso2: z.string().length(2),
  regionId: idSchema,
  kpis: marketKpisSchema,
});

export const seriesRowSchema = z.object({
  marketId: idSchema,
  productId: idSchema,
  period: periodSchema,
  actual: z.number(),
  forecast: z.number(),
  units: z.number(),
  priorYear: z.number(),
});

export const datasetSchema = z.object({
  meta: z.object({
    currency: z.string().length(3),
    periods: z.array(periodSchema).min(1),
    latestPeriod: periodSchema,
    generatedAt: z.string(),
  }),
  regions: z.array(z.object({ id: idSchema, name: z.string() })).min(1),
  products: z.array(z.object({ id: idSchema, name: z.string() })).min(1),
  markets: z.array(marketSchema).min(1),
  series: z.array(seriesRowSchema).min(1),
}) satisfies z.ZodType<Dataset>;

/* ---------------- Assistant contract ---------------- */

export const citationSchema = z.object({
  marketId: idSchema.optional(),
  regionId: idSchema.optional(),
  productId: idSchema.optional(),
  period: periodSchema.optional(),
  label: z.string().optional(),
}) satisfies z.ZodType<Citation>;

export const streamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("token"), value: z.string() }),
  z.object({
    type: z.literal("done"),
    kind: answerKindSchema,
    citations: z.array(citationSchema),
    confidence: confidenceSchema,
  }),
  z.object({ type: z.literal("error"), message: z.string() }),
]) satisfies z.ZodType<StreamEvent>;

const fixtureSchema = z.object({
  id: z.string(),
  keywords: z.array(z.string()).optional(),
  kind: answerKindSchema,
  answer: z.object({
    text: z.string(),
    citations: z.array(citationSchema),
    confidence: confidenceSchema,
  }),
  error: z.string().optional(),
});

export const fixturesSchema = z.object({
  note: z.string().optional(),
  default: fixtureSchema,
  fixtures: z.array(fixtureSchema),
}) satisfies z.ZodType<Fixtures>;
