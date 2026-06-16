import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/badges/StatusBadge";

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
import { toast } from "sonner";
import { fmtDate } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [{ title: "Usuários — Datasentinel" }, { name: "robots", content: "noindex" }],
  }),
  component: UsersPage,
});

type Role = "admin" | "analyst" | "viewer";

function roleTone(r: Role) {
  return r === "admin" ? "destructive" : r === "analyst" ? "info" : "neutral";
}

function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const list = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const [{ data: profiles, error: pe }, { data: roles, error: re }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (pe) throw pe;
      if (re) throw re;
      const roleMap = new Map<string, Role[]>();
      for (const r of roles ?? []) {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role as Role);
        roleMap.set(r.user_id, arr);
      }
      return (profiles ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      // Replace roles with the single chosen one (MVP keeps it simple).
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      toast.success("Role atualizada");
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (list.data ?? []).filter((u) =>
    search ? (u.display_name ?? "").toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Usuários & roles"
        description="Atribua roles a usuários existentes. Novos usuários têm por padrão a role viewer."
      />
      <div className="space-y-4 px-6 py-6">
        <Input
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Card>
          <CardContent className="p-0">
            {list.isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={6} columns={4} />
              </div>
            ) : !filtered.length ? (
              <EmptyState title="Nenhum usuário" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">Usuário</th>
                      <th className="px-4 py-2">Cargo</th>
                      <th className="px-4 py-2">Roles</th>
                      <th className="px-4 py-2">Criado em</th>
                      <th className="px-4 py-2">Definir role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2">
                          <div className="font-medium">{u.display_name ?? "—"}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {u.id.slice(0, 8)}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm">{u.job_title ?? "—"}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length === 0 ? (
                              <span className="text-xs text-muted-foreground">nenhuma</span>
                            ) : (
                              u.roles.map((r) => (
                                <StatusBadge key={r} label={r} tone={roleTone(r)} />
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                          {fmtDate(u.created_at)}
                        </td>
                        <td className="px-4 py-2">
                          <RoleSelect
                            current={u.roles[0]}
                            onChange={(role) => setRole.mutate({ userId: u.id, role })}
                            disabled={setRole.isPending}
                          />
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

function RoleSelect({
  current,
  onChange,
  disabled,
}: {
  current?: Role;
  onChange: (r: Role) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={current ?? ""} onValueChange={(v) => onChange(v as Role)} disabled={disabled}>
      <SelectTrigger className="h-8 w-32">
        <SelectValue placeholder="Atribuir…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="viewer">viewer</SelectItem>
        <SelectItem value="analyst">analyst</SelectItem>
        <SelectItem value="admin">admin</SelectItem>
      </SelectContent>
    </Select>
  );
}
