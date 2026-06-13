# Auditoria de Acessibilidade & Teclado

Auditoria de linha de base realizada no Módulo 8. O escopo é o MVP — WCAG 2.1 AA onde for viável, com refinamentos adiados listados no final.

## Landmarks

- `AppShell` renderiza `<aside aria-label="Primary navigation">`, `<header aria-label="Application header">` e `<main id="main-content">`.
- Um link "Skip to main content" é o primeiro elemento focável em toda página autenticada.
- Exatamente um `<h1>` por página via `PageHeader`.

## Teclado

- Todos os elementos interativos são `<button>`, `<a>`, `<input>` nativos ou primitivas shadcn baseadas em Radix — a ordem de foco segue a ordem do DOM.
- Os anéis de foco vêm dos tokens de ring do shadcn (`focus-visible:ring-2 focus-visible:ring-ring`); sem sobrescritas de `outline: none`.
- Diálogos / dropdowns herdam o trapping de foco do Radix e o fechamento com Esc.

## Formulários

- Todo input tem um `<Label htmlFor="...">` associado.
- Campos obrigatórios usam o atributo nativo `required`.
- Botões são desabilitados durante o envio e exibem progresso via `Loader2`.

## Cor & contraste

- Superfícies claras/escuras usam tokens semânticos (`--background`, `--foreground`, `--muted`, `--primary`) — sem `text-gray-*` arbitrário sobre branco.
- Badges de status / risco codificam o estado tanto por cor QUANTO por texto.

## Imagens & ícones

- Ícones decorativos usam `aria-hidden`.
- Botões apenas com ícone (sair, etc.) incluem rótulos de texto ou `aria-label`.

## Erros & carregamento

- `RouteError` usa `role="alert"`.
- `TableSkeleton` expõe `role="status"` + `aria-label`.
- `EmptyState` usa headings semânticos e texto descritivo.

## Lacunas conhecidas (pós-MVP)

- Nenhum teste formal com leitor de tela contra scripts de NVDA / VoiceOver.
- O comportamento de recolhimento da sidebar no mobile é mínimo — depende de ocultação responsiva em vez de um menu off-canvas completo.
- Gráficos (`recharts`) herdam os padrões da biblioteca; sem descrições customizadas em formato longo.
