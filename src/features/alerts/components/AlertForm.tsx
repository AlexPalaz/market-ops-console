"use client";

import { useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useData } from "@/data/DataProvider";
import { cn } from "@/lib/utils";
import {
  ALERT_SEVERITIES,
  alertInputSchema,
  type AlertFormValues,
  type AlertInput,
} from "../schemas/alertSchema";

const DEFAULTS: AlertFormValues = {
  name: "",
  scope: "portfolio",
  targetId: "",
  growthBelowPct: "",
  attainmentBelowPct: "",
  severity: "warning",
  enabled: true,
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-destructive text-xs">
      {message}
    </p>
  );
}

/**
 * Schema-validated alert configurator. Zod owns the rules; React Hook Form
 * owns the field state; the dataset supplies the scope targets. Every error
 * is tied to its field with aria-describedby and aria-invalid.
 */
export function AlertForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (values: AlertInput) => void;
  onCancel?: () => void;
  submitting?: boolean;
}) {
  const index = useData();
  const uid = useId();
  const id = (f: string) => `${uid}-${f}`;

  const form = useForm<AlertFormValues, unknown, AlertInput>({
    resolver: zodResolver(alertInputSchema),
    defaultValues: DEFAULTS,
    mode: "onBlur",
  });
  const { register, handleSubmit, control, formState, setValue } = form;
  const { errors } = formState;
  const scope = useWatch({ control, name: "scope" });

  const targets =
    scope === "region"
      ? index.regions.map((r) => ({ id: r.id, name: r.name }))
      : scope === "market"
        ? [...index.markets]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((m) => ({ id: m.id, name: m.name }))
        : [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={id("name")}>Alert name</Label>
        <Input
          id={id("name")}
          placeholder="e.g. Europe under plan"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? id("name-err") : id("name-hint")}
          {...register("name")}
        />
        <FieldError id={id("name-err")} message={errors.name?.message} />
        <p id={id("name-hint")} className="text-muted-foreground text-xs">
          Demo: a name starting with &ldquo;fail&rdquo; makes the save fail, to show the rollback.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={id("scope")}>Scope</Label>
          <Controller
            control={control}
            name="scope"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  setValue("targetId", "", { shouldValidate: false });
                }}
              >
                <SelectTrigger id={id("scope")} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portfolio">Whole portfolio</SelectItem>
                  <SelectItem value="region">A region</SelectItem>
                  <SelectItem value="market">A market</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor={id("target")}
            className={cn(scope === "portfolio" && "text-muted-foreground")}
          >
            {scope === "region" ? "Region" : scope === "market" ? "Market" : "Target"}
          </Label>
          <Controller
            control={control}
            name="targetId"
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={scope === "portfolio"}
              >
                <SelectTrigger
                  id={id("target")}
                  className="w-full"
                  aria-invalid={!!errors.targetId}
                  aria-describedby={errors.targetId ? id("target-err") : undefined}
                >
                  <SelectValue placeholder={scope === "portfolio" ? "All markets" : "Choose…"} />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError id={id("target-err")} message={errors.targetId?.message} />
        </div>
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-medium">Flag a market when…</legend>
        <div className="space-y-1.5">
          <Label htmlFor={id("growth")}>Growth YoY is below (%)</Label>
          <Input
            id={id("growth")}
            type="number"
            step="0.1"
            inputMode="decimal"
            placeholder="e.g. 0"
            aria-invalid={!!errors.growthBelowPct}
            aria-describedby={errors.growthBelowPct ? id("growth-err") : undefined}
            {...register("growthBelowPct")}
          />
          <FieldError id={id("growth-err")} message={errors.growthBelowPct?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("attainment")}>Forecast attainment is below (%)</Label>
          <Input
            id={id("attainment")}
            type="number"
            step="0.1"
            inputMode="decimal"
            placeholder="e.g. 95"
            aria-invalid={!!errors.attainmentBelowPct}
            aria-describedby={errors.attainmentBelowPct ? id("attainment-err") : undefined}
            {...register("attainmentBelowPct")}
          />
          <FieldError id={id("attainment-err")} message={errors.attainmentBelowPct?.message} />
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={id("severity")}>Severity</Label>
          <Controller
            control={control}
            name="severity"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={id("severity")} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Controller
            control={control}
            name="enabled"
            render={({ field }) => (
              <Switch id={id("enabled")} checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor={id("enabled")}>Enabled</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          Save alert
        </Button>
      </div>
    </form>
  );
}
