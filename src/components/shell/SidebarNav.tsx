import { Link } from "@tanstack/react-router";
import {
  Database,
  LayoutDashboard,
  ListOrdered,
  ScrollText,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";

const PRIMARY = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ranking", label: "Ranking", icon: ListOrdered },
  { to: "/investigations", label: "Investigations", icon: Search },
] as const;

const ADMIN = [
  { to: "/admin/ingestion", label: "Ingestion", icon: Database },
  { to: "/admin/ml", label: "ML runs", icon: Sparkles },
  { to: "/admin/logs", label: "System logs", icon: ScrollText },
  { to: "/admin/users", label: "Users", icon: Users },
] as const;

export function SidebarNav() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
        <ShieldAlert className="h-5 w-5 text-primary" />
        <span className="font-display text-lg font-semibold tracking-tight">Sentinel</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Primary">
        {PRIMARY.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            inactiveProps={{ className: "text-sidebar-foreground/80 hover:bg-sidebar-accent/40" }}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}

        {isAdmin ? (
          <>
            <p className="mt-4 px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Admin
            </p>
            {ADMIN.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
                inactiveProps={{ className: "text-sidebar-foreground/80 hover:bg-sidebar-accent/40" }}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </>
        ) : null}
      </nav>
      <p className="px-5 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        MVP · v0.1
      </p>
    </div>
  );
}
