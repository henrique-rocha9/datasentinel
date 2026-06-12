import { type ReactNode } from "react";

import { AppShell } from "./AppShell";
import { SidebarNav } from "./SidebarNav";
import { Topbar } from "./Topbar";

export function AuthedLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell sidebar={<SidebarNav />} topbar={<Topbar />}>
      {children}
    </AppShell>
  );
}
