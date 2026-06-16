import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { StatusBadge } from "@/components/badges/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function Topbar() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const primaryRole = roles[0] ?? "viewer";

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3">
      <div className="text-sm text-muted-foreground">{user?.email}</div>
      <div className="flex items-center gap-3">
        <StatusBadge
          label={primaryRole}
          tone={
            primaryRole === "admin" ? "destructive" : primaryRole === "analyst" ? "info" : "neutral"
          }
        />
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
}
