import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Upload } from "lucide-react";

import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/_authenticated/admin/ingestion")({
  head: () => ({
    meta: [{ title: "Ingestion — Datasentinel" }, { name: "robots", content: "noindex" }],
  }),
  component: IngestionPage,
});

type Batch = {
  id: string;
  source_filename: string | null;
  source_kind: "products" | "metrics";
  row_count: number;
  success_count: number;
  error_count: number;
  status: string;
  started_at: string;
  finished_at: string | null;
};

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length);
  if (!lines.length) return { headers: [], rows: [] };
  const split = (l: string) => l.split(",").map((c) => c.trim());
  return { headers: split(lines[0]), rows: lines.slice(1).map(split) };
}

async function ingestMetrics(
  rows: string[][],
  headers: string[],
  batchId: string,
): Promise<{ success: number; errors: { row_number: number; error_message: string; raw: any }[] }> {
  const idx = (k: string) => headers.indexOf(k);
  const required = [
    "external_product_id",
    "defect_count",
    "parts_replaced",
    "retrabalho",
    "resolution_time_hours",
    "warranty_status",
    "state_code",
  ];
  const missing = required.filter((k) => idx(k) === -1);
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}`);

  // Preload model_id map
  const ids = Array.from(new Set(rows.map((r) => r[idx("external_product_id")]).filter(Boolean)));
  const { data: models } = await supabase
    .from("product_models")
    .select("id, external_product_id")
    .in("external_product_id", ids);
  const modelMap = new Map((models ?? []).map((m) => [m.external_product_id, m.id]));

  const errors: { row_number: number; error_message: string; raw: any }[] = [];
  let success = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const raw: Record<string, string> = {};
    headers.forEach((h, j) => (raw[h] = r[j]));
    const ext = raw["external_product_id"];
    const model_id = modelMap.get(ext);
    if (!model_id) {
      errors.push({ row_number: i + 2, error_message: `Unknown product ${ext}`, raw });
      continue;
    }
    const defect = Number(raw["defect_count"]);
    const isHigh = defect >= 3 || Number(raw["retrabalho"]) >= 2;
    const { error } = await supabase.from("product_metrics").insert({
      model_id,
      defect_count: defect,
      parts_replaced: Number(raw["parts_replaced"]),
      retrabalho: Number(raw["retrabalho"]),
      resolution_time_hours: Number(raw["resolution_time_hours"]),
      warranty_status: raw["warranty_status"],
      state_code: raw["state_code"],
      is_high_os: isHigh,
      source: "import",
      import_batch_id: batchId,
      raw_payload: raw,
    });
    if (error) errors.push({ row_number: i + 2, error_message: error.message, raw });
    else success++;
  }
  return { success, errors };
}

function IngestionPage() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<"metrics">("metrics");
  const [file, setFile] = useState<File | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  const batches = useQuery({
    queryKey: ["import_batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_batches")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Batch[];
    },
  });

  const errs = useQuery({
    queryKey: ["import_errors", selectedBatch],
    enabled: !!selectedBatch,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_errors")
        .select("*")
        .eq("batch_id", selectedBatch!)
        .order("row_number", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Select a CSV file first");
      const text = await file.text();
      const { headers, rows } = parseCsv(text);
      if (!rows.length) throw new Error("CSV is empty");

      const { data: batch, error: be } = await supabase
        .from("import_batches")
        .insert({
          source_filename: file.name,
          source_kind: kind,
          row_count: rows.length,
          status: "running",
        })
        .select()
        .single();
      if (be) throw be;

      try {
        const { success, errors } = await ingestMetrics(rows, headers, batch.id);
        if (errors.length) {
          await supabase.from("import_errors").insert(
            errors.map((e) => ({
              batch_id: batch.id,
              row_number: e.row_number,
              error_message: e.error_message,
              raw_row: e.raw,
            })),
          );
        }
        await supabase
          .from("import_batches")
          .update({
            success_count: success,
            error_count: errors.length,
            status: errors.length && !success ? "failed" : "completed",
            finished_at: new Date().toISOString(),
          })
          .eq("id", batch.id);
        return { success, errors: errors.length };
      } catch (err: any) {
        await supabase
          .from("import_batches")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            notes: err.message,
          })
          .eq("id", batch.id);
        throw err;
      }
    },
    onSuccess: (r) => {
      toast.success(`Imported ${r.success} rows, ${r.errors} errors`);
      setFile(null);
      qc.invalidateQueries({ queryKey: ["import_batches"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Data ingestion"
        description="Upload CSV batches and review prior imports."
        actions={
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" /> Upload CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Kind</Label>
                  <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metrics">Metrics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>File</Label>
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required: external_product_id, defect_count, parts_replaced, retrabalho,
                    resolution_time_hours, warranty_status, state_code
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => upload.mutate()}
                  disabled={!file || upload.isPending}
                >
                  {upload.isPending ? "Importing…" : "Start import"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="space-y-4 px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent batches</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {batches.isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={6} columns={6} />
              </div>
            ) : !batches.data?.length ? (
              <EmptyState title="No imports yet" description="Upload a CSV to start." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">File</th>
                      <th className="px-4 py-2">Kind</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2 text-right">Rows</th>
                      <th className="px-4 py-2 text-right">OK</th>
                      <th className="px-4 py-2 text-right">Errors</th>
                      <th className="px-4 py-2">Started</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {batches.data.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono text-xs">{b.source_filename ?? "—"}</td>
                        <td className="px-4 py-2">{b.source_kind}</td>
                        <td className="px-4 py-2">
                          <StatusBadge
                            label={b.status}
                            tone={
                              b.status === "completed"
                                ? "success"
                                : b.status === "failed"
                                  ? "destructive"
                                  : b.status === "running"
                                    ? "info"
                                    : "neutral"
                            }
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-mono">{fmtNum(b.row_count)}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmtNum(b.success_count)}</td>
                        <td className="px-4 py-2 text-right font-mono">
                          {b.error_count > 0 ? (
                            <button
                              onClick={() => setSelectedBatch(b.id)}
                              className="underline decoration-dotted hover:text-foreground"
                            >
                              {fmtNum(b.error_count)}
                            </button>
                          ) : (
                            "0"
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                          {fmtDate(b.started_at)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedBatch(b.id)}>
                            View errors
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedBatch} onOpenChange={(o) => !o && setSelectedBatch(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Import errors</DialogTitle>
            </DialogHeader>
            {errs.isLoading ? (
              <TableSkeleton rows={5} columns={3} />
            ) : !errs.data?.length ? (
              <EmptyState title="No errors recorded" />
            ) : (
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Error</th>
                      <th className="px-3 py-2">Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {errs.data.map((e: any) => (
                      <tr key={e.id}>
                        <td className="px-3 py-2 font-mono text-xs">{e.row_number ?? "—"}</td>
                        <td className="px-3 py-2 text-destructive">{e.error_message}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                          {JSON.stringify(e.raw_row)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
