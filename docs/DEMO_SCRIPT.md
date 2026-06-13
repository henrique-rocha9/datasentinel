# Demo Script

Run the demo seed migration once; it is idempotent (sentinel:
`product_families.code = 'DEMO'`).

## 5-minute walkthrough
1. **Sign in** at `/auth`. Use an admin account (default new users get
   `viewer`; promote via `/admin/users`).
2. **Dashboard** (`/dashboard`) — show KPI cards (monitored products, open
   alerts, investigations) and the recent alerts feed.
3. **Ranking** (`/ranking`) — sort the 6 demo models by risk.
4. **Product detail** (`/products/<modelId>`) — open a high-risk model,
   review aggregates and risk history.
5. **Investigations** (`/investigations`) — show the open and in-progress
   investigations seeded by the migration.
6. **Investigation detail** — add a comment, move status to `resolved`,
   confirm the linked alert auto-closes (DB trigger).
7. **Admin → Ingestion** — upload a sample CSV; show batch + error
   reporting.
8. **Admin → ML** — trigger a mocked run; open the detail page to inspect
   metrics/artifacts JSON.
9. **Admin → Logs** — filter system_logs by action.
10. **Admin → Users** — switch a user's role.

## Reset
Re-running the seed migration is a no-op. To force-reset, clear the
`DEMO` family rows manually and re-run.
