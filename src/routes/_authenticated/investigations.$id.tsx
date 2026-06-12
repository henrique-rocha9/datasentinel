import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/badges/StatusBadge";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  fmtDate,
  investigationStatusTone,
  normalizeInvestigationStatus,
} from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/investigations/$id")({
  head: () => ({ meta: [{ title: "Investigation — Sentinel" }, { name: "robots", content: "noindex" }] }),
  component: InvestigationDetail,
});

const STATUSES = ["open", "in_progress", "resolved", "dismissed"] as const;

async function fetchInvestigation(id: string) {
  const [inv, logs] = await Promise.all([
    supabase
      .from("investigations")
      .select(
        "id, reason, description, status, opened_at, closed_at, model_id, opened_by, assigned_analyst_id, triggering_alert_id, product_models(external_product_id, name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("investigation_logs")
      .select("id, log_type, content, metadata, created_at, author_id")
      .eq("investigation_id", id)
      .order("created_at", { ascending: true }),
  ]);
  return { inv: inv.data, logs: logs.data ?? [] };
}

function InvestigationDetail() {
  const { id } = Route.useParams();
  const { user, hasAnyRole } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["investigation", id],
    queryFn: () => fetchInvestigation(id),
  });
  const [comment, setComment] = useState("");

  const inv = data?.inv;
  const canEdit =
    !!inv && (hasAnyRole(["admin"]) || (hasAnyRole(["analyst"]) && inv.assigned_analyst_id === user?.id));

  const updateStatus = useMutation({
    mutationFn: async (next: (typeof STATUSES)[number]) => {
      const { error } = await supabase.from("investigations").update({ status: next }).eq("id", id);
      if (error) throw error;
      await supabase.from("investigation_logs").insert({
        investigation_id: id,
        author_id: user?.id,
        log_type: "status_change",
        content: `Status → ${next}`,
        metadata: { to: next },
      });
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["investigation", id] });
      qc.invalidateQueries({ queryKey: ["investigations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("investigation_logs").insert({
        investigation_id: id,
        author_id: user?.id,
        log_type: "comment",
        content: comment,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["investigation", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Comment failed"),
  });

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!inv) {
    return (
      <div className="p-6">
        <EmptyState title="Investigation not found" />
      </div>
    );
  }

  const status = normalizeInvestigationStatus(inv.status);

  return (
    <div>
      <PageHeader
        eyebrow="Investigation"
        title={inv.reason}
        description={
          <span>
            Product:{" "}
            <Link to="/products/$modelId" params={{ modelId: inv.model_id }} className="underline">
              {(inv as any).product_models?.external_product_id} · {(inv as any).product_models?.name}
            </Link>
          </span>
        }
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/investigations">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {inv.description ? (
              <p className="rounded-md border border-border bg-muted/30 p-3 text-sm">{inv.description}</p>
            ) : null}
            {!data?.logs.length ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.logs.map((l: any) => (
                  <li key={l.id} className="rounded-md border border-border p-3 text-sm">
                    <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      <span>{l.log_type}</span>
                      <span>·</span>
                      <span>{fmtDate(l.created_at)}</span>
                    </div>
                    {l.content ? <p>{l.content}</p> : null}
                  </li>
                ))}
              </ul>
            )}

            {canEdit && status !== "resolved" && status !== "dismissed" ? (
              <div className="space-y-2 border-t border-border pt-4">
                <Textarea
                  placeholder="Add a comment…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => addComment.mutate()}
                    disabled={!comment.trim() || addComment.isPending}
                  >
                    Post comment
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <StatusBadge label={status} tone={investigationStatusTone(status)} />
              {canEdit ? (
                <div>
                  <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    Change status
                  </p>
                  <Select
                    value={status}
                    onValueChange={(v) => updateStatus.mutate(v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {inv.triggering_alert_id ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Resolving or dismissing will auto-resolve the linked alert.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Row k="Opened" v={fmtDate(inv.opened_at)} />
              <Row k="Closed" v={fmtDate(inv.closed_at)} />
              <Row k="Triggering alert" v={inv.triggering_alert_id ?? "—"} mono />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className={mono ? "truncate font-mono text-xs" : ""}>{v}</span>
    </div>
  );
}
