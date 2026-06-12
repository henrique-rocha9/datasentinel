import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: {
  supabase: ReturnType<typeof Object> & any;
  userId: string;
}) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

const RiskClass = z.enum(["low", "medium", "high"]);

export const rebuildAggregates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ modelId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.rpc("fn_rebuild_aggregates", {
      _model_id: data.modelId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordRiskChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        modelId: z.string().uuid(),
        newClass: RiskClass,
        newScore: z.number(),
        probLow: z.number(),
        probMedium: z.number(),
        probHigh: z.number(),
        confidence: z.number(),
        modelVersion: z.string().min(1),
        sourceMetricId: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: historyId, error } = await context.supabase.rpc(
      "fn_record_risk_change",
      {
        _model_id: data.modelId,
        _new_class: data.newClass,
        _new_score: data.newScore,
        _prob_low: data.probLow,
        _prob_medium: data.probMedium,
        _prob_high: data.probHigh,
        _confidence: data.confidence,
        _model_version: data.modelVersion,
        _source_metric_id: data.sourceMetricId ?? null,
      },
    );
    if (error) throw new Error(error.message);
    return { historyId };
  });

export const recordClusterChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        modelId: z.string().uuid(),
        newCluster: z.number().int(),
        newLabel: z.string().min(1),
        characteristics: z.record(z.string(), z.any()).default({}),
        modelVersion: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: historyId, error } = await context.supabase.rpc(
      "fn_record_cluster_change",
      {
        _model_id: data.modelId,
        _new_cluster: data.newCluster,
        _new_label: data.newLabel,
        _characteristics: data.characteristics,
        _model_version: data.modelVersion,
      },
    );
    if (error) throw new Error(error.message);
    return { historyId };
  });
