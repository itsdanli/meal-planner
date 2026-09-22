# Initial architecture decision

Status: implementation starting point · September 21, 2026

## Delivery boundary

Keep the existing root website operational. Build the replacement in `app/`, with its own Vite entry point. The first slice is a working, clearly labeled sample household with browser persistence. This is a foundation for M1, not completion of authenticated cross-device persistence.

## Choices

- React and TypeScript organize the growing three-screen interface and make domain contracts explicit.
- Vite produces static assets; the frontend does not require an always-on application server.
- Existing recipe JSON remains the input library. Do not copy personal preferences into public sample data.
- A pure grocery calculation module owns arithmetic and conservative ingredient matching. The UI and eventual assistant call this same module.
- The initial storage module isolates local persistence. Supabase is the proposed authenticated backend, with household access enforced by Postgres row-level security.
- Retailer OAuth, model calls, and cart writes belong behind authenticated server functions; no live credentials belong in the static build.

## Current limitations

The sample contains one editable week, without historical plan storage. There is no live login, retailer connection, cart submission, or AI inference yet. The sample UI must communicate this. The database migration is reviewed source until applied and tested on a configured backend.

## Why this sequence

The interface, calculation engine, and database design can proceed independently against shared domain types. Prove the meal-to-list experience first, then attach authenticated persistence. Retailer feasibility remains a separate gate for shopping, so provider access cannot prevent progress on the core planner.

## Budget

Target zero fixed hosting costs and a $10/month overall ceiling. Retain a deterministic sample experience that works without database or model availability. Evaluate deployment/provider configuration before provisioning; do not enable paid upgrades automatically.

## Next integration milestone

Configure a free backend, run migrations and isolation checks, implement an authenticated repository adapter, and verify a saved plan on two browsers. Preserve recipe snapshots in saved plans. Then validate the local King Soopers integration with an explicitly approved small cart operation.
