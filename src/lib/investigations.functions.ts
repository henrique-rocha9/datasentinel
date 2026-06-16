import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StatusEnum = z.enum(["open", "in_progress", "resolved", "dismissed"]);

export const updateInvestigationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: StatusEnum }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("investigations")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const STATUS_LABELS: Record<string, string> = {
      open: "Aberto",
      in_progress: "Em andamento",
      resolved: "Resolvido",
      dismissed: "Descartado",
    };
    const { error: logErr } = await supabase.from("investigation_logs").insert({
      investigation_id: data.id,
      author_id: userId,
      log_type: "status_change",
      content: `Status → ${STATUS_LABELS[data.status] ?? data.status}`,
      metadata: { to: data.status },
    });
    if (logErr) throw new Error(logErr.message);

    return { ok: true };
  });

export const addInvestigationComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), content: z.string().min(1).max(4000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("investigation_logs").insert({
      investigation_id: data.id,
      author_id: userId,
      log_type: "comment",
      content: data.content,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
