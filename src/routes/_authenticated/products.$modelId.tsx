import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FilePlus2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { RiskBadge } from "@/components/badges/RiskBadge";
import { SeverityBadge } from "@/components/badges/SeverityBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  fmtDate,
  fmtNum,
  investigationStatusTone,
  normalizeInvestigationStatus,
  riskClassFromString,
} from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/products/$modelId")({
  head: () => ({ meta: [{ title: "Product — Datasentinel" }, { name: "robots", content: "noindex" }] }),
  component: ProductDetailPage,
});

async function fetchProduct(modelId: string) {
  const [model, agg, risk, cluster, history, alerts, invs] = await Promise.all([
    supabase
      .from("product_models")
      .select("id, external_product_id, name, sku, state_code, warranty_default, family_id, product_families(name)")
      .eq("id", modelId)
      .maybeSingle(),
    supabase.from("product_aggregates").select("*").eq("model_id", modelId).maybeSingle(),
    supabase.from("risk_current").select("*").eq("model_id", modelId).maybeSingle(),
    supabase.from("cluster_current").select("*").eq("model_id", modelId).maybeSingle(),
    supabase
      .from("risk_history")
      .select("id, previous_class, new_class, new_score, transition, created_at, model_version")
      .eq("model_id", modelId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("alerts")
      .select("id, severity, title, message, status, created_at")
      .eq("model_id", modelId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("investigations")
      .select("id, reason, status, opened_at, assigned_analyst_id")
      .eq("model_id", modelId)
      .order("opened_at", { ascending: false })
      .limit(10),
  ]);
  return {
    model: model.data,
    agg: agg.data,
    risk: risk.data,
    cluster: cluster.data,
    history: history.data ?? [],
    alerts: alerts.data ?? [],
    investigations: invs.data ?? [],
  };
}

function ProductDetailPage() {
  const { modelId } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["product", modelId],
    queryFn: () => fetchProduct(modelId),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (!data?.model) {
    return (
      <div className="p-6">
        <EmptyState title="Product not found" description="This product may have been removed." />
      </div>
    );
  }

  const m = data.model;
  const r = data.risk;
  const a = data.agg;

  return (
    <div>
      <PageHeader
        eyebrow="Product"
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono text-base text-muted-foreground">{m.external_product_id}</span>
            {m.name}
          </span>
        }
        description={
          <span>
            Family: {(m as any).product_families?.name ?? "—"} · State: {m.state_code ?? "—"} · Warranty:{" "}
            {m.warranty_default ?? "—"}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/ranking">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to ranking
              </Link>
            </Button>
            <OpenInvestigationDialog modelId={m.id} alertId={data.alerts[0]?.id} />
          </div>
        }
      />

      <div className="space-y-6 px-6 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Current risk</p>
              {r ? (
                <div className="mt-2 space-y-2">
                  <RiskBadge level={riskClassFromString(r.risk_class)} />
                  <p className="font-mono text-2xl">{Number(r.risk_score).toFixed(3)}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    conf {(Number(r.confidence) * 100).toFixed(0)}% · v{r.model_version}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No prediction yet</p>
              )}
            </CardContent>
          </Card>
          <Kpi label="Total OS" value={fmtNum(a?.total_os)} />
          <Kpi label="High OS %" value={a ? `${Number(a.high_os_percentage).toFixed(1)}%` : "—"} />
          <Kpi
            label="Avg resolution (h)"
            value={a ? Number(a.avg_resolution_time).toFixed(1) : "—"}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk class probabilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["high", "medium", "low"] as const).map((k) => {
                const prob = r ? Number((r as any)[`prob_${k}`]) : 0;
                const pct = Math.round(prob * 100);
                return (
                  <div key={k} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <RiskBadge level={k} />
                      <span className="font-mono text-xs">{pct}%</span>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Failure-mode cluster</CardTitle>
            </CardHeader>
            <CardContent>
              {data.cluster ? (
                <div className="space-y-2">
                  <p className="font-display text-xl">
                    #{data.cluster.cluster_id} · {data.cluster.cluster_label}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    model v{data.cluster.model_version} · {fmtDate(data.cluster.inferred_at)}
                  </p>
                  {data.cluster.cluster_characteristics ? (
                    <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-muted/40 p-3 font-mono text-[11px]">
                      {JSON.stringify(data.cluster.cluster_characteristics, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No cluster assignment</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Risk history</CardTitle></CardHeader>
            <CardContent>
              {!data.history.length ? (
                <p className="text-sm text-muted-foreground">No transitions yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.history.map((h: any) => (
                    <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-mono text-xs">
                        {h.previous_class ?? "—"} → <b>{h.new_class}</b> · {Number(h.new_score).toFixed(3)}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{fmtDate(h.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Alerts</CardTitle></CardHeader>
            <CardContent>
              {!data.alerts.length ? (
                <p className="text-sm text-muted-foreground">No alerts.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.alerts.map((al: any) => (
                    <li key={al.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={al.severity} />
                          <span className="truncate">{al.title}</span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{al.message}</p>
                      </div>
                      <StatusBadge label={al.status} tone={al.status === "open" ? "warning" : "success"} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Investigations</CardTitle></CardHeader>
          <CardContent>
            {!data.investigations.length ? (
              <p className="text-sm text-muted-foreground">No investigations opened.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.investigations.map((i: any) => (
                  <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                    <Link to="/investigations/$id" params={{ id: i.id }} className="hover:underline">
                      {i.reason}
                    </Link>
                    <div className="flex items-center gap-3">
                      <StatusBadge
                        label={normalizeInvestigationStatus(i.status)}
                        tone={investigationStatusTone(i.status)}
                      />
                      <span className="font-mono text-xs text-muted-foreground">{fmtDate(i.opened_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function OpenInvestigationDialog({ modelId, alertId }: { modelId: string; alertId?: string }) {
  const { user, hasAnyRole } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [desc, setDesc] = useState("");
  const canOpen = hasAnyRole(["analyst", "admin"]);

  const mut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("investigations")
        .insert({
          model_id: modelId,
          reason,
          description: desc || null,
          triggering_alert_id: alertId ?? null,
          opened_by: user?.id,
          assigned_analyst_id: user?.id,
          status: "open",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      toast.success("Investigation opened");
      setOpen(false);
      setReason("");
      setDesc("");
      qc.invalidateQueries({ queryKey: ["product", modelId] });
      navigate({ to: "/investigations/$id", params: { id: row.id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to open investigation"),
  });

  if (!canOpen) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <FilePlus2 className="mr-2 h-4 w-4" /> Open investigation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open investigation</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea id="desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => mut.mutate()} disabled={!reason || mut.isPending}>
            {mut.isPending ? "Opening…" : "Open"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
