import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  head: () => ({
    meta: [{ title: "Logs do sistema — Datasentinel" }, { name: "robots", content: "noindex" }],
  }),
  component: LogsPage,
});

const PAGE = 50;

function LogsPage() {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["system_logs", page, filter],
    queryFn: async () => {
      let q = supabase
        .from("system_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (filter) q = q.ilike("action", `%${filter}%`);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const total = data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Logs do sistema"
        description="Trilha de auditoria de ações do sistema."
      />
      <div className="space-y-4 px-6 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Filtrar por ação…"
            value={filter}
            onChange={(e) => {
              setPage(0);
              setFilter(e.target.value);
            }}
            className="max-w-xs"
          />
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="font-mono text-xs text-muted-foreground">
              {page + 1} / {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={8} columns={5} />
              </div>
            ) : !data?.rows.length ? (
              <EmptyState title="Nenhum log" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">Quando</th>
                      <th className="px-4 py-2">Ação</th>
                      <th className="px-4 py-2">Entidade</th>
                      <th className="px-4 py-2">Autor</th>
                      <th className="px-4 py-2">Metadados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.rows.map((l: any) => (
                      <tr key={l.id} className="hover:bg-muted/30">
                        <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-muted-foreground">
                          {fmtDate(l.created_at)}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{l.action}</td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                          {l.entity_type ? `${l.entity_type}#${l.entity_id ?? "—"}` : "—"}
                        </td>
                        <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">
                          {l.actor_id?.slice(0, 8) ?? "sistema"}
                        </td>
                        <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">
                          {l.metadata ? JSON.stringify(l.metadata).slice(0, 80) : "—"}
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
