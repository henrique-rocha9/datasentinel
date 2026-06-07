import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck } from "lucide-react";

import { StatusBadge } from "@/components/badges/StatusBadge";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Workspace — Sentinel" }, { name: "robots", content: "noindex" }] }),
  component: AuthedHome,
});

function AuthedHome() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title={`Welcome, ${user?.user_metadata?.display_name ?? user?.email ?? "analyst"}`}
        description="Module 2 is live. Dashboard, ranking, and investigations land in upcoming modules."
        actions={
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        }
      />
      <div className="grid gap-6 px-6 py-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span className="font-mono">{user?.email}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">User ID</span>
              <span className="truncate font-mono text-xs">{user?.id}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roles</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {roles.length === 0 ? (
              <StatusBadge label="No role assigned" tone="warning" />
            ) : (
              roles.map((r) => (
                <StatusBadge
                  key={r}
                  label={r}
                  tone={r === "admin" ? "destructive" : r === "analyst" ? "info" : "neutral"}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
