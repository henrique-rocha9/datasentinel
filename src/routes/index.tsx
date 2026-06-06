import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, BarChart3, GitBranch, Search, ShieldAlert, Workflow } from "lucide-react";

import { RiskBadge } from "@/components/badges/RiskBadge";
import { SeverityBadge } from "@/components/badges/SeverityBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sentinel — Anomaly Detection & Risk Classification" },
      {
        name: "description",
        content:
          "Sentinel ingests product metrics, predicts risk, clusters failure modes, and routes alerts into investigations — all in one workspace.",
      },
      { property: "og:title", content: "Sentinel — Anomaly Detection & Risk Classification" },
      {
        property: "og:description",
        content:
          "End-to-end risk intelligence for industrial products: ingestion, prediction, clustering, investigation.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground"
            >
              <Activity className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">Sentinel</span>
          </div>
          <nav aria-label="Primary" className="hidden items-center gap-6 text-sm md:flex">
            <a className="text-muted-foreground hover:text-foreground" href="#workflow">
              Workflow
            </a>
            <a className="text-muted-foreground hover:text-foreground" href="#design">
              Design system
            </a>
          </nav>
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            MVP · Module 1
          </span>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_0%,oklch(0.66_0.13_195/0.18),transparent_60%),radial-gradient(40%_40%_at_90%_10%,oklch(0.78_0.16_70/0.14),transparent_60%)]"
          />
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
              Anomaly detection · Risk classification
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              See risk forming <span className="text-primary">before it costs you</span>.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
              Sentinel ingests product service metrics, classifies each unit's risk level,
              clusters failure modes, and turns escalations into actionable investigations.
              One workspace, one workflow, full audit trail.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                Authentication, dashboards, and ML controls arrive in Modules 2–5.
              </span>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                View design tokens ↓
              </Link>
            </div>

            {/* Risk preview */}
            <div className="mt-12 grid gap-3 sm:grid-cols-4">
              {(
                [
                  { level: "low", label: "Stable population", value: "62%" },
                  { level: "medium", label: "Watchlist", value: "23%" },
                  { level: "high", label: "Escalating", value: "11%" },
                  { level: "critical", label: "Action required", value: "4%" },
                ] as const
              ).map((row) => (
                <div
                  key={row.level}
                  className="rounded-lg border border-border bg-card p-4 shadow-sm"
                >
                  <RiskBadge level={row.level} />
                  <p className="mt-3 font-display text-3xl font-semibold tracking-tight">
                    {row.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{row.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  The five-step workflow
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                  Ingest → Predict → Cluster → Visualize → Investigate
                </h2>
              </div>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {[
                { icon: Workflow, title: "Ingest", body: "Upload CSV batches with row-level validation and history." },
                { icon: BarChart3, title: "Predict", body: "Per-product risk score and class with stable probabilities." },
                { icon: GitBranch, title: "Cluster", body: "Group products by failure-mode signature for triage." },
                { icon: ShieldAlert, title: "Visualize", body: "Dashboard, ranking, and per-product timelines." },
                { icon: Search, title: "Investigate", body: "Promote alerts into tracked investigations with findings." },
              ].map(({ icon: Icon, title, body }, i) => (
                <div key={title} className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Design system preview */}
        <section id="design">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Module 1 verification
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Design system baseline
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Semantic tokens, risk scale, severity scale, status scale, and typography pair.
              Every page built on this foundation inherits the same look in light and dark themes.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-display text-sm font-semibold">Risk levels</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <RiskBadge level="low" />
                  <RiskBadge level="medium" />
                  <RiskBadge level="high" />
                  <RiskBadge level="critical" />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-display text-sm font-semibold">Alert severity</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <SeverityBadge severity="medium" />
                  <SeverityBadge severity="high" />
                  <SeverityBadge severity="critical" />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-display text-sm font-semibold">Status tones</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge label="Open" tone="info" />
                  <StatusBadge label="In progress" tone="warning" />
                  <StatusBadge label="Resolved" tone="success" />
                  <StatusBadge label="Dismissed" tone="neutral" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span className="font-mono uppercase tracking-wider">Sentinel · Academic MVP</span>
          <span>Module 1 of 8</span>
        </div>
      </footer>
    </div>
  );
}
