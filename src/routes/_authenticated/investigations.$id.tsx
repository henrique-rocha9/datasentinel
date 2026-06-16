import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { addInvestigationComment, updateInvestigationStatus } from "@/lib/investigations.functions";

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
import { fmtDate, investigationStatusTone, normalizeInvestigationStatus } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/investigations/$id")({
  head: () => ({
    meta: [{ title: "Investigação — Datasentinel" }, { name: "robots", content: "noindex" }],
  }),
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
    !!inv &&
    (hasAnyRole(["admin"]) || (hasAnyRole(["analyst"]) && inv.assigned_analyst_id === user?.id));

  const updateStatusFn = useServerFn(updateInvestigationStatus);
  const addCommentFn = useServerFn(addInvestigationComment);

  const updateStatus = useMutation({
    mutationFn: (next: (typeof STATUSES)[number]) => updateStatusFn({ data: { id, status: next } }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["investigation", id] });
      qc.invalidateQueries({ queryKey: ["investigations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha na atualização"),
  });

  const addComment = useMutation({
    mutationFn: () => addCommentFn({ data: { id, content: comment } }),
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["investigation", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao comentar"),
  });

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando…</p>;
  if (!inv) {
    return (
      <div className="p-6">
        <EmptyState title="Investigação não encontrada" />
      </div>
    );
  }

  const status = normalizeInvestigationStatus(inv.status);

  return (
    <div>
      <PageHeader
        eyebrow="Investigação"
        title={inv.reason}
        description={
          <span>
            Produto:{" "}
            <Link to="/products/$modelId" params={{ modelId: inv.model_id }} className="underline">
              {(inv as any).product_models?.external_product_id} ·{" "}
              {(inv as any).product_models?.name}
            </Link>
          </span>
        }
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/investigations">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Atividade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {inv.description ? (
              <p className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                {inv.description}
              </p>
            ) : null}
            {!data?.logs.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade ainda.</p>
            ) : (
              <ul className="space-y-3">
                {data.logs.map((l: any) => {
                  const LOG_TYPE_LABELS: Record<string, string> = {
                    comment: "Comentário",
                    status_change: "Alteração de status",
                    creation: "Criação",
                  };
                  return (
                    <li key={l.id} className="rounded-md border border-border p-3 text-sm">
                      <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        <span>{LOG_TYPE_LABELS[l.log_type] ?? l.log_type}</span>
                        <span>·</span>
                        <span>{fmtDate(l.created_at)}</span>
                      </div>
                      {l.content ? <p>{l.content}</p> : null}
                    </li>
                  );
                })}
              </ul>
            )}

            {canEdit && status !== "resolved" && status !== "dismissed" ? (
              <div className="space-y-2 border-t border-border pt-4">
                <Textarea
                  placeholder="Adicionar um comentário…"
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
                    Enviar comentário
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const STATUS_LABELS: Record<string, string> = {
                  open: "Aberto",
                  in_progress: "Em andamento",
                  resolved: "Resolvido",
                  dismissed: "Descartado",
                };
                return (
                  <>
                    <StatusBadge
                      label={STATUS_LABELS[status] ?? status}
                      tone={investigationStatusTone(status)}
                    />
                    {canEdit ? (
                      <div>
                        <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                          Alterar status
                        </p>
                        <Select
                          value={status}
                          onValueChange={(v) => updateStatus.mutate(v as (typeof STATUSES)[number])}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {STATUS_LABELS[s] ?? s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {inv.triggering_alert_id ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Resolver ou descartar irá resolver automaticamente o alerta associado.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Row k="Aberto em" v={fmtDate(inv.opened_at)} />
              <Row k="Fechado em" v={fmtDate(inv.closed_at)} />
              <Row k="Alerta gerador" v={inv.triggering_alert_id ?? "—"} mono />
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
