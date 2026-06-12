import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtNum } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/admin/ml/$id")({
  head: () => ({
    meta: [{ title: "ML Run — Sentinel" }, { name: "robots", content: "noindex" }],
  }),
  component: RunDetail,
});

function tone(s: string) {
  if (s === "success") return "success" as const;
  if (s === "failed") return "destructive" as const;
  if (s === "running") return "info" as const;
  return "neutral" as const;
}

function RunDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["ml_run", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("ml_runs").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const meta = (data?.metadata ?? {}) as any;
  const metrics = meta.metrics ?? {};
  const artifacts = (meta.artifacts ?? []) as any[];

  return (
    <div>
      <PageHeader
        eyebrow="Admin · ML"
        title={data ? `${data.run_type} · ${data.model_version ?? ""}` : "Run"}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/ml">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Run</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {isLoading || !data ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : (
              <>
                <Field label="Status">
                  <StatusBadge label={data.status} tone={tone(data.status)} />
                </Field>
                <Field label="Type">{data.run_type}</Field>
                <Field label="Model version">{data.model_version ?? "—"}</Field>
                <Field label="Started">{fmtDate(data.started_at)}</Field>
                <Field label="Finished">{fmtDate(data.finished_at)}</Field>
                <Field label="Rows processed">{fmtNum(data.rows_processed)}</Field>
                {data.error_text ? (
                  <Field label="Error">
                    <span className="text-destructive">{data.error_text}</span>
                  </Field>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.keys(metrics).length === 0 ? (
              <p className="text-muted-foreground">No metrics recorded.</p>
            ) : (
              Object.entries(metrics).map(([k, v]) => (
                <Field key={k} label={k}>
                  <span className="font-mono">{String(v)}</span>
                </Field>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Artifacts</CardTitle>
          </CardHeader>
          <CardContent>
            {artifacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No artifacts.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {artifacts.map((a, i) => (
                  <li key={i} className="font-mono">
                    {a.name}
                    {a.size_kb ? ` · ${a.size_kb} kB` : ""}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span>{children}</span>
    </div>
  );
}
