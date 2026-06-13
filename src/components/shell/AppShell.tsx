import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  sidebar?: ReactNode;
  topbar?: ReactNode;
  className?: string;
}

/**
 * AppShell — application chrome used by every authenticated route.
 *
 * Sidebar and topbar are slotted in by callers (Module 2 wires real nav
 * + user menu). Renders semantic landmarks (<aside>, <header>, <main>)
 * so the keyboard / screen-reader audit in Module 8 has stable targets.
 */
export function AppShell({ children, sidebar, topbar, className }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      {sidebar ? (
        <aside
          aria-label="Primary navigation"
          className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col"
        >
          {sidebar}
        </aside>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar ? (
          <header
            aria-label="Application header"
            className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70"
          >
            {topbar}
          </header>
        ) : null}
        <main id="main-content" className={cn("flex-1", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
