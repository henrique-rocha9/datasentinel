# Accessibility & Keyboard Audit

Baseline audit performed in Module 8. Scope is MVP — WCAG 2.1 AA where
practical, deferred polish noted at the end.

## Landmarks

- `AppShell` renders `<aside aria-label="Primary navigation">`,
  `<header aria-label="Application header">`, and `<main id="main-content">`.
- A "Skip to main content" link is the first focusable element on every
  authenticated page.
- Exactly one `<h1>` per page via `PageHeader`.

## Keyboard

- All interactive elements are native `<button>`, `<a>`, `<input>`, or
  Radix-based shadcn primitives — focus order follows DOM order.
- Focus rings come from the shadcn ring tokens (`focus-visible:ring-2
focus-visible:ring-ring`); no `outline: none` overrides.
- Dialogs / dropdowns inherit Radix focus trapping and Esc-to-close.

## Forms

- Every input has an associated `<Label htmlFor="...">`.
- Required fields use the native `required` attribute.
- Buttons disable while submitting and surface progress via `Loader2`.

## Color & contrast

- Light/dark surfaces use semantic tokens (`--background`, `--foreground`,
  `--muted`, `--primary`) — no arbitrary `text-gray-*` on white.
- Status / risk badges encode state with both color AND text.

## Images & icons

- Decorative icons use `aria-hidden`.
- Icon-only buttons (sign-out, etc.) include text labels or `aria-label`.

## Errors & loading

- `RouteError` uses `role="alert"`.
- `TableSkeleton` exposes `role="status"` + `aria-label`.
- `EmptyState` uses semantic headings and descriptive text.

## Known gaps (post-MVP)

- No formal screen-reader pass against NVDA / VoiceOver scripts.
- Sidebar collapse behavior on mobile is minimal — relies on
  responsive hiding rather than a full off-canvas menu.
- Charts (`recharts`) inherit library defaults; no custom long-form
  descriptions.
