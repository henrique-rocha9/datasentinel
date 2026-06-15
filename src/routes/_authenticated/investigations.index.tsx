import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { StatusBadge } from "@/components/badges/StatusBadge";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/feedback/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import {
  fmtDate,
  fmtNum,
  investigationStatusTone,
  normalizeInvestigationStatus,
} from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/investigations/")({
  head: () => ({ meta: [{ title: "Investigations — Datasentinel" }, { name: "robots", content: "noindex" }] }),
  component: InvestigationsBoard,
});

const COLUMNS = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In progress" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
] as const;

async function fetchInvestigations() {
  const { data, error } = await supabase
    .from("investigations")
    .select(
      "id, reason, status, opened_at, model_id, assigned_analyst_id, product_models(external_product_id, name)",
    )
    .order("opened_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

function InvestigationsBoard() {
  const { data, isLoading } = useQuery({
    queryKey: ["investigations"],
    queryFn: fetchInvestigations,
  });
  const [view, setView] = useState<"board" | "list">("board");

  const groups: Record<string, typeof data> = {
    open: [],
    in_progress: [],
    resolved: [],
    dismissed: [],
  };
  for (const i of data ?? []) {
    const k = normalizeInvestigationStatus(i.status as string);
    if (k in groups) (groups[k] ??= []).push(i as any);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workflow"
        title="Investigations"
        description="Triage, assign, and resolve product investigations. Legacy 'closed' items appear under Resolved."
        actions={
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />
      <div className="px-6 py-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data?.length ? (
          <EmptyState title="No investigations" description="Open one from a product page." />
        ) : view === "board" ? (
          <div className="grid gap-4 lg:grid-cols-4">
            {COLUMNS.map((col) => (
              <Card key={col.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>{col.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {fmtNum(groups[col.key]?.length ?? 0)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(groups[col.key] ?? []).map((i: any) => (
                    <Link
                      key={i.id}
                      to="/investigations/$id"
                      params={{ id: i.id }}
                      className="block rounded-md border border-border bg-card p-3 transition-colors hover:border-primary/50"
                    >
                      <p className="line-clamp-2 text-sm font-medium">{i.reason}</p>
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        {i.product_models?.external_product_id} · {i.product_models?.name}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {fmtDate(i.opened_at)}
                      </p>
                    </Link>
                  ))}
                  {!(groups[col.key]?.length) ? (
                    <p className="text-xs text-muted-foreground">—</p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Reason</th>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Opened</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.map((i: any) => (
                    <tr key={i.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <StatusBadge
                          label={normalizeInvestigationStatus(i.status)}
                          tone={investigationStatusTone(i.status)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Link to="/investigations/$id" params={{ id: i.id }} className="hover:underline">
                          {i.reason}
                        </Link>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">
                        <Link to="/products/$modelId" params={{ modelId: i.model_id }} className="hover:underline">
                          {i.product_models?.external_product_id}
                        </Link>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                        {fmtDate(i.opened_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
