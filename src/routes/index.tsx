import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, BarChart3, GitBranch, Search, ShieldAlert, Workflow } from "lucide-react";

import { RiskBadge } from "@/components/badges/RiskBadge";
import { SeverityBadge } from "@/components/badges/SeverityBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Datasentinel — Detecção de Anomalias & Classificação de Risco" },
      {
        name: "description",
        content:
          "O Datasentinel realiza a Ingestão de métricas de produtos, prevê riscos, agrupa modos de falha em clusters e direciona alertas para investigações — tudo em um único workspace.",
      },
      {
        property: "og:title",
        content: "Datasentinel — Detecção de Anomalias & Classificação de Risco",
      },
      {
        property: "og:description",
        content:
          "Inteligência de risco de ponta a ponta para produtos industriais: ingestão, previsão, clustering e investigação.",
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
            <span className="font-display text-lg font-semibold tracking-tight">Datasentinel</span>
          </div>
          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-6 text-sm md:flex"
          >
            <a className="text-muted-foreground hover:text-foreground" href="#workflow">
              Fluxo de trabalho
            </a>
            <a className="text-muted-foreground hover:text-foreground" href="#design">
              Sistema de design
            </a>
          </nav>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Entrar
          </Link>
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
              Detecção de anomalias · Classificação de risco
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Veja o risco se formando{" "}
              <span className="text-primary">antes que ele custe caro</span>.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
              O Datasentinel realiza a ingestão de métricas de serviço do produto, classifica o
              nível de risco de cada unidade, agrupa em clusters os modos de falha e transforma
              escalonamentos em investigações acionáveis. Um único workspace, um único fluxo de
              trabalho, trilha de auditoria completa.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Abrir workspace
              </Link>
              <a
                href="#workflow"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Ver fluxo de trabalho ↓
              </a>
            </div>

            {/* Risk preview */}
            <div className="mt-12 grid gap-3 sm:grid-cols-4">
              {(
                [
                  { level: "low", label: "População estável", value: "62%" },
                  { level: "medium", label: "Lista de observação", value: "23%" },
                  { level: "high", label: "Escalonando", value: "11%" },
                  { level: "critical", label: "Ação necessária", value: "4%" },
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
                  O fluxo de trabalho de cinco etapas
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                  Ingestão → Previsão → Cluster → Visualização → Investigação
                </h2>
              </div>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {[
                {
                  icon: Workflow,
                  title: "Ingestão",
                  body: "Envie lotes de CSV com validação no nível da linha e histórico.",
                },
                {
                  icon: BarChart3,
                  title: "Previsão",
                  body: "Score de risco e classe por produto com probabilidades estáveis.",
                },
                {
                  icon: GitBranch,
                  title: "Cluster",
                  body: "Agrupe produtos por assinatura de modo de falha para triagem.",
                },
                {
                  icon: ShieldAlert,
                  title: "Visualização",
                  body: "Dashboard, ranking e cronogramas por produto.",
                },
                {
                  icon: Search,
                  title: "Investigação",
                  body: "Promova alertas em investigações rastreadas com descobertas.",
                },
              ].map(({ icon: Icon, title, body }, i) => (
                <div key={title} className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
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
              Verificação do Módulo 1
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Linha de base do sistema de design
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Tokens semânticos, escala de risco, escala de severidade, escala de status e par
              tipográfico. Cada página construída sobre esta base herda a mesma aparência nos temas
              claro e escuro.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-display text-sm font-semibold">Níveis de risco</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <RiskBadge level="low" />
                  <RiskBadge level="medium" />
                  <RiskBadge level="high" />
                  <RiskBadge level="critical" />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-display text-sm font-semibold">Severidade dos alertas</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <SeverityBadge severity="medium" />
                  <SeverityBadge severity="high" />
                  <SeverityBadge severity="critical" />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-display text-sm font-semibold">Tons de status</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge label="Aberto" tone="info" />
                  <StatusBadge label="Em andamento" tone="warning" />
                  <StatusBadge label="Resolvido" tone="success" />
                  <StatusBadge label="Descartado" tone="neutral" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span className="font-mono uppercase tracking-wider">Datasentinel · MVP Acadêmico</span>
          <span>Módulo 1 de 8</span>
        </div>
      </footer>
    </div>
  );
}
