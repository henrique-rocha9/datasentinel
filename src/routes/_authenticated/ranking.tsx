import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { RiskBadge } from "@/components/badges/RiskBadge";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { fmtDate, fmtNum, riskClassFromString } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/ranking")({
  head: () => ({
    meta: [{ title: "Ranking — Datasentinel" }, { name: "robots", content: "noindex" }],
  }),
  component: RankingPage,
});

type Row = {
  model_id: string;
  risk_class: string;
  risk_score: number;
  inferred_at: string;
  confidence: number;
  product_models: { external_product_id: string; name: string } | null;
  // joined later
  agg?: {
    total_os: number;
    high_os_percentage: number;
    avg_resolution_time: number;
  };
};

async function fetchRanking(): Promise<Row[]> {
  const { data: risk, error } = await supabase
    .from("risk_current")
    .select(
      "model_id, risk_class, risk_score, inferred_at, confidence, product_models(external_product_id, name)",
    )
    .order("risk_score", { ascending: false })
    .limit(200);
  if (error) throw error;

  const ids = (risk ?? []).map((r) => r.model_id);
  let aggMap = new Map<string, Row["agg"]>();
  if (ids.length) {
    const { data: aggs } = await supabase
      .from("product_aggregates")
      .select("model_id, total_os, high_os_percentage, avg_resolution_time")
      .in("model_id", ids);
    aggMap = new Map(
      (aggs ?? []).map((a) => [
        a.model_id,
        {
          total_os: a.total_os,
          high_os_percentage: Number(a.high_os_percentage),
          avg_resolution_time: Number(a.avg_resolution_time),
        },
      ]),
    );
  }
  return (risk ?? []).map((r: any) => ({ ...r, agg: aggMap.get(r.model_id) }));
}

function RankingPage() {
  const { data, isLoading } = useQuery({ queryKey: ["ranking"], queryFn: fetchRanking });
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const filtered = (data ?? []).filter((r) => {
    if (riskFilter !== "all" && r.risk_class !== riskFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const pm = r.product_models;
      return (
        pm?.external_product_id.toLowerCase().includes(q) || pm?.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        eyebrow="Risco"
        title="Ranking de risco de produtos"
        description="Principais produtos ordenados pelo score de risco atual previsto. Clique em uma linha para inspecionar."
      />
      <div className="space-y-4 px-6 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar produto ou SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis de risco</SelectItem>
              <SelectItem value="high">Alto</SelectItem>
              <SelectItem value="medium">Médio</SelectItem>
              <SelectItem value="low">Baixo</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {fmtNum(filtered.length)} / {fmtNum(data?.length ?? 0)}
          </span>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={8} />
              </div>
            ) : !filtered.length ? (
              <EmptyState
                title="Nenhum produto correspondente"
                description="Ajuste os filtros ou realize a ingestão de mais métricas."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2">Produto</th>
                      <th className="px-4 py-2">Risco</th>
                      <th className="px-4 py-2 text-right">Score</th>
                      <th className="px-4 py-2 text-right">Confiança</th>
                      <th className="px-4 py-2 text-right">Total de OS</th>
                      <th className="px-4 py-2 text-right">% de OS Alta</th>
                      <th className="px-4 py-2">Inferido em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((r, idx) => (
                      <tr key={r.model_id} className="hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2">
                          <Link
                            to="/products/$modelId"
                            params={{ modelId: r.model_id }}
                            className="font-medium hover:underline"
                          >
                            {r.product_models?.external_product_id ?? "—"}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {r.product_models?.name ?? ""}
                          </p>
                        </td>
                        <td className="px-4 py-2">
                          <RiskBadge level={riskClassFromString(r.risk_class)} />
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {Number(r.risk_score).toFixed(3)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-xs">
                          {(Number(r.confidence) * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {fmtNum(r.agg?.total_os)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {r.agg ? `${r.agg.high_os_percentage.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                          {fmtDate(r.inferred_at)}
                        </td>
                      </tr>
                    ))}
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
