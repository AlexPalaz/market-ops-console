import { z } from "zod";

export const ALERT_SCOPES = ["portfolio", "region", "market"] as const;
export const ALERT_SEVERITIES = ["info", "warning", "critical"] as const;
export type AlertScope = (typeof ALERT_SCOPES)[number];
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

/** Empty strings and NaN from number inputs become "not set". */
const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    if (typeof v === "string") {
      const n = Number(v);
      return Number.isNaN(n) ? v : n;
    }
    if (typeof v === "number" && Number.isNaN(v)) return undefined;
    return v;
  }, schema.optional());

/**
 * What the form produces. Scope ids are checked against the dataset by the
 * form (it has the index); the API re-validates shape only.
 */
const alertFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Give the alert a name of at least 3 characters")
    .max(60, "Keep the name under 60 characters"),
  scope: z.enum(ALERT_SCOPES),
  targetId: z.string().trim().optional(),
  growthBelowPct: optionalNumber(
    z
      .number()
      .min(-100, "Growth threshold cannot be below -100%")
      .max(100, "Growth threshold cannot exceed 100%"),
  ),
  attainmentBelowPct: optionalNumber(
    z
      .number()
      .min(0, "Attainment threshold cannot be negative")
      .max(200, "Attainment threshold cannot exceed 200%"),
  ),
  severity: z.enum(ALERT_SEVERITIES),
  enabled: z.boolean(),
});

export const alertInputSchema = alertFieldsSchema.superRefine((v, ctx) => {
  if (v.scope !== "portfolio" && !v.targetId) {
    ctx.addIssue({ code: "custom", path: ["targetId"], message: `Pick a ${v.scope}` });
  }
  if (v.growthBelowPct === undefined && v.attainmentBelowPct === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["growthBelowPct"],
      message: "Set at least one threshold: growth or forecast attainment",
    });
  }
});

export type AlertInput = z.output<typeof alertInputSchema>;
export type AlertFormValues = z.input<typeof alertInputSchema>;

export const alertSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  name: z.string(),
  scope: z.enum(ALERT_SCOPES),
  targetId: z.string().optional(),
  growthBelowPct: z.number().optional(),
  attainmentBelowPct: z.number().optional(),
  severity: z.enum(ALERT_SEVERITIES),
  enabled: z.boolean(),
});

export type Alert = z.output<typeof alertSchema>;

export const alertListSchema = z.array(alertSchema);
export const alertPatchSchema = alertFieldsSchema.partial();
