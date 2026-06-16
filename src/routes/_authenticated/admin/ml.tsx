import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Play } from "lucide-react";

import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtDate, fmtNum } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/admin/ml")({
  head: () => ({
    meta: [{ title: "Execuções de ML — Datasentinel" }, { name: "robots", content: "noindex" }],
  }),
  component: MlPage,
});

const ML_API = "http://localhost:8000";

type RunType = "risk_inference" | "clustering" | "training";

function statusTone(s: string) {
  if (s === "success") return "success" as const;
  if (s === "failed") return "destructive" as const;
  if (s === "running") return "info" as const;
  if (s === "skipped") return "neutral" as const;
  return "neutral" as const;
}

function MlPage() {
  const qc = useQueryClient();
  const [runType, setRunType] = useState<RunType>("risk_inference");

  const runs = useQuery({
    queryKey: ["ml_runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const trigger = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const { data: u } = await supabase.auth.getUser();

      // 1. Insert run record as "running"
      const { data: ins, error } = await supabase
        .from("ml_runs")
        .insert({
          run_type: runType,
          status: "running",
          started_at: now,
          triggered_by: u.user?.id,
          model_version: "pending",
        })
        .select()
        .single();
      if (error) throw error;

      // 2. Call Python ML API
      let result: any;
      try {
        const resp = await fetch(`${ML_API}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ run_type: runType }),
        });
        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg);
        }
        result = await resp.json();
      } catch (err: any) {
        await supabase
          .from("ml_runs")
          .update({ status: "failed", finished_at: new Date().toISOString() })
          .eq("id", ins.id);
        throw new Error(`ML API error: ${err.message}`);
      }

      // 3. Persist real results back to Supabase
      await supabase
        .from("ml_runs")
        .update({
          status: result.status,
          finished_at: new Date().toISOString(),
          rows_processed: result.rows_processed,
          model_version: result.model_version,
          metadata: result.metadata,
        })
        .eq("id", ins.id);
    },
    onSuccess: () => {
      toast.success("Execução simulada concluída");
      qc.invalidateQueries({ queryKey: ["ml_runs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Operações de ML"
        description="Dispare e inspecione execuções de modelos (simuladas para MVP)."
        actions={
          <div className="flex items-center gap-2">
            <Select value={runType} onValueChange={(v) => setRunType(v as RunType)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="risk_inference">Inferência de risco</SelectItem>
                <SelectItem value="clustering">Clustering</SelectItem>
                <SelectItem value="training">Treinamento</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => trigger.mutate()} disabled={trigger.isPending}>
              <Play className="mr-2 h-4 w-4" /> Disparar execução
            </Button>
          </div>
        }
      />
      <div className="space-y-4 px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Execuções recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {runs.isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={6} columns={6} />
              </div>
            ) : !runs.data?.length ? (
              <EmptyState
                title="Nenhuma execução de ML ainda"
                description="Dispare uma execução para popular."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">Tipo</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Versão</th>
                      <th className="px-4 py-2 text-right">Linhas</th>
                      <th className="px-4 py-2">Iniciada em</th>
                      <th className="px-4 py-2">Finalizada em</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {runs.data.map((r: any) => {
                      const RUN_TYPE_LABELS: Record<string, string> = {
                        risk_inference: "Inferência de risco",
                        clustering: "Clustering",
                        training: "Treinamento",
                      };
                      const RUN_STATUS_LABELS: Record<string, string> = {
                        success: "Sucesso",
                        failed: "Falhou",
                        running: "Executando",
                      };
                      return (
                        <tr key={r.id} className="hover:bg-muted/30">
                          <td className="px-4 py-2">{RUN_TYPE_LABELS[r.run_type] ?? r.run_type}</td>
                          <td className="px-4 py-2">
                            <StatusBadge
                              label={RUN_STATUS_LABELS[r.status] ?? r.status}
                              tone={statusTone(r.status)}
                            />
                          </td>
                          <td className="px-4 py-2 font-mono text-xs">{r.model_version ?? "—"}</td>
                          <td className="px-4 py-2 text-right font-mono">
                            {fmtNum(r.rows_processed)}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                            {fmtDate(r.started_at)}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                            {fmtDate(r.finished_at)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button asChild variant="ghost" size="sm">
                              <Link to="/admin/ml/$id" params={{ id: r.id }}>
                                Abrir
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
