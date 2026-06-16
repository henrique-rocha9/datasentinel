import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Activity, Search, Layers } from "lucide-react";

import { RiskBadge } from "@/components/badges/RiskBadge";
import { SeverityBadge } from "@/components/badges/SeverityBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import {
  fmtDate,
  fmtNum,
  investigationStatusTone,
  normalizeInvestigationStatus,
  riskClassFromString,
} from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Datasentinel" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardPage,
});

async function fetchDashboard() {
  const [models, risk, openAlerts, openInv, recentAlerts] = await Promise.all([
    supabase.from("product_models").select("id", { count: "exact", head: true }),
    supabase.from("risk_current").select("risk_class"),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("investigations").select("status"),
    supabase
      .from("alerts")
      .select(
        "id, severity, title, status, created_at, model_id, product_models(external_product_id, name)",
      )
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const counts = { low: 0, medium: 0, high: 0 };
  for (const r of risk.data ?? []) {
    const k = r.risk_class as keyof typeof counts;
    if (k in counts) counts[k]++;
  }
  const invCounts = { open: 0, in_progress: 0, resolved: 0, dismissed: 0 };
  for (const i of openInv.data ?? []) {
    const k = normalizeInvestigationStatus(i.status as string) as keyof typeof invCounts;
    if (k in invCounts) invCounts[k]++;
  }

  return {
    productCount: models.count ?? 0,
    riskCounts: counts,
    openAlertCount: openAlerts.count ?? 0,
    invCounts,
    recentAlerts: recentAlerts.data ?? [],
  };
}

function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });

  return (
    <div>
      <PageHeader
        eyebrow="Visão geral"
        title="Dashboard operacional"
        description="Visão em tempo real de produtos monitorados, distribuição de risco, alertas e investigações ativas."
      />
      <div className="space-y-6 px-6 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Kpi
            label="Produtos monitorados"
            value={fmtNum(data?.productCount)}
            icon={<Layers className="h-4 w-4" />}
          />
          <Kpi
            label="Alertas abertos"
            value={fmtNum(data?.openAlertCount)}
            icon={<AlertCircle className="h-4 w-4 text-risk-high" />}
          />
          <Kpi
            label="Investigações abertas"
            value={fmtNum((data?.invCounts.open ?? 0) + (data?.invCounts.in_progress ?? 0))}
            icon={<Search className="h-4 w-4 text-info" />}
          />
          <Kpi
            label="Produtos de alto risco"
            value={fmtNum(data?.riskCounts.high)}
            icon={<Activity className="h-4 w-4 text-risk-high" />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Distribuição de risco</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["high", "medium", "low"] as const).map((k) => {
                const total =
                  (data?.riskCounts.high ?? 0) +
                  (data?.riskCounts.medium ?? 0) +
                  (data?.riskCounts.low ?? 0);
                const v = data?.riskCounts[k] ?? 0;
                const pct = total ? Math.round((v / total) * 100) : 0;
                return (
                  <div key={k} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <RiskBadge level={k} />
                      <span className="font-mono text-xs text-muted-foreground">
                        {fmtNum(v)} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={
                          k === "high"
                            ? "h-full bg-risk-high"
                            : k === "medium"
                              ? "h-full bg-risk-medium"
                              : "h-full bg-risk-low"
                        }
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Alertas recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton rows={5} />
              ) : !data?.recentAlerts.length ? (
                <EmptyState
                  title="Nenhum alerta ainda"
                  description="Os alertas aparecerão aqui conforme o risco aumentar."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {data.recentAlerts.map((a: any) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={a.severity} />
                          <Link
                            to="/products/$modelId"
                            params={{ modelId: a.model_id }}
                            className="truncate font-medium hover:underline"
                          >
                            {a.product_models?.external_product_id ?? "Product"} ·{" "}
                            {a.product_models?.name ?? ""}
                          </Link>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{a.title}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge
                          label={
                            a.status === "open"
                              ? "Aberto"
                              : a.status === "resolved"
                                ? "Resolvido"
                                : "Descartado"
                          }
                          tone={a.status === "open" ? "warning" : "success"}
                        />
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {fmtDate(a.created_at)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline de investigação</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(
              [
                { key: "open", label: "Aberto" },
                { key: "in_progress", label: "Em andamento" },
                { key: "resolved", label: "Resolvido" },
                { key: "dismissed", label: "Descartado" },
              ] as const
            ).map((s) => (
              <div key={s.key} className="rounded-md border border-border bg-card p-4">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-2 font-display text-3xl font-semibold">
                  {fmtNum(data?.invCounts[s.key])}
                </p>
                <StatusBadge
                  label={s.label}
                  tone={investigationStatusTone(s.key)}
                  className="mt-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-2">{icon}</div>
      </CardContent>
    </Card>
  );
}
