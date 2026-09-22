# Weeknight Planner — Product Requirements

Version: 0.1 · Draft for iteration · September 21, 2026

Implementation status: the initial sample application is in `app/`, with This Week, Pantry, Grocery Review, local persistence, recipe selection, servings/protein choices, text export, and print markup. The grocery engine and storage have 13 passing tests; the production build passes. Browser checks covered recipe search/addition, pantry persistence after reload, reset, and mobile layout. Supabase schema and setup instructions are prepared but have not been applied or tested against a live backend. M1 is not complete: authenticated cross-device persistence, historical plans, private recipe editing, and remaining acceptance criteria still require implementation. Printed pagination has not yet been visually verified.

This document guides the proposed build. Requirements marked **proposed** are recommendations, not settled user decisions. External integration capabilities must pass the feasibility gate below before implementation promises depend on them.

## 1. Product intent

Help a household choose a few meals, account for groceries already on hand, and prepare the remaining shopping with minimal weekly effort. Preserve a clear, printable weekly cooking plan. Deliver a deployed, visually polished application that also demonstrates practical engineering judgment to prospective employers.

The central experience is: **plan meals → check pantry → review groceries → prepare shopping → cook**.

### Confirmed direction

- The existing static planner is the starting point.
- Users need accounts and persistent data across devices.
- Pantry awareness should reduce unnecessary purchases without tedious inventory work.
- Users choose a few meals each week; the app calculates what to buy.
- Grocery automation should use an existing API where practical.
- The owner currently uses Amazon Grocery but is willing to switch; King Soopers and Walmart are nearby options.
- Low operating cost, everyday usability, attractive design, and a demonstrable deployed project matter.
- Target roles are forward-deployed engineering: customer-facing implementation and AI integration.
- Aim for free operation, with a maximum $10/month operating budget for personal use and a small public demo (excluding grocery purchases).

### Working assumptions to validate

- One owner per household initially; household invitations are deferred.
- Grocery pickup is an acceptable first shopping workflow; delivery support depends on integration validation.
- Prefer free infrastructure and a deterministic public sample experience. Reserve any paid AI usage for tightly limited, explicitly invoked actions.
- No fixed delivery date. Milestones are gated by acceptance criteria.

## 2. Users and outcomes

**Primary user:** the owner planning several dinners for a household each week, often from familiar recipes.

**Secondary user:** another person using an independent account with their own pantry, plans, and preferences.

**Demo visitor:** a recruiter or engineer who needs to understand and try the product without account setup or a grocery-store login.

Proposed success measures:

| Outcome | Initial target / measurement |
| --- | --- |
| Fast weekly planning | Owner prepares a three-meal plan and reviewed grocery list in under five minutes after onboarding; measure across four weekly uses. |
| Repeat usefulness | Owner completes the workflow for four consecutive weeks; record friction and corrections. |
| Grocery correctness | Curated calculation fixtures pass; uncertain ingredients are visibly unresolved rather than silently omitted. |
| Integration usefulness | One owner-approved shopping transfer succeeds at the selected local store and is manually verified in the retailer cart. |
| Demo clarity | A new visitor completes the sample plan-to-shopping-preview flow within three minutes without external credentials. |
| Cost visibility | Record infrastructure cost and model usage; enforce the $10/month ceiling before any paid public AI access. |

These are targets, not claims about measured results.

## 3. Existing application and migration

The current app contains recipe browsing, favorites, serving multipliers, protein choices, grocery text/JSON exports, and print views. Some preferences persist in localStorage. Recipes and other content are JSON files; application code lives in index.html.

Retain recipe content and working print behavior. Import recipes with stable identifiers and validate ingredient amounts/units. Offer a one-time import of browser-local favorites and preferences after sign-in, with a preview and duplicate-safe behavior. Do not treat bundled personal preference or product-memory files as defaults for every new account.

Current aggregation uses ingredient names and identical units. Replace this with explicit ingredient identity and supported conversions. Include selected protein add-ons consistently in scaling, shopping, and printing. Preserve access to existing cocktail, smoothie, and smoker content during migration; extending those workflows is outside the initial build.

## 4. Scope and milestones

### M0 — Integration feasibility and product decisions

Timebox the integration investigation to approximately two development days, excluding provider approval waits.

- Register a Kroger developer application when the owner is ready to provide the required account setup.
- Find the intended King Soopers location through the API.
- Confirm shopper authorization works for the owner's account and chosen fulfillment method.
- Search representative products at that location and inspect actual price, size, and availability fields.
- Test an explicitly approved small cart addition and manually inspect the retailer result.
- Document scopes, quotas, access terms, costs, token behavior, and unsupported operations.

**Exit:** recorded evidence establishes the live capabilities, or the team selects a fallback. Until then, King Soopers support is a target, not a verified integration. If blocked, continue M1 and the labeled demo while evaluating Instacart handoff; do not quietly substitute browser automation.

### M1 — Persistent planner

Accounts, saved recipes and plans, pantry review, accurate grocery calculation, responsive design, and print/export. No retailer connection or AI is required for the core workflow.

### M2 — Assisted shopping

One validated retailer adapter, product selection, package quantities, a review screen, explicit cart submission, saved preferences, and useful error recovery. Add a deterministic demo adapter alongside the live integration.

### M3 — Agent-assisted planning and portfolio release

A bounded assistant uses application tools to propose plans and shopping drafts. Add evaluations, operational visibility, a public sample experience, and a concise engineering case study. M1/M2 can deploy earlier; the intended portfolio release includes M3.

### Deferred

Autonomous checkout/payment, background purchases, Amazon browser automation, multiple live retailer integrations, cross-store price optimization, receipt/photo ingestion, exact automatic pantry inventory, collaborative household editing, nutrition optimization, and unrestricted web recipe ingestion.

## 5. Functional requirements and acceptance criteria

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| ACC-01 | Sign-in and private persistence | A returning user sees the same saved plan/pantry on a second browser. A different account cannot read or mutate that data, including via direct API requests. |
| REC-01 | Recipe library | Browse/search existing recipes, inspect ingredients and steps, favorite recipes, and save a private recipe through a form without editing JSON. Invalid quantities or missing units needing clarification are flagged. |
| PLAN-01 | Weekly plans | Choose a week, add/remove/swap meals, change servings per meal, and reuse a prior week. Reload preserves edits; historical plans preserve their ingredient quantities if a source recipe later changes. |
| PAN-01 | Low-effort pantry | Search/add items and mark Have it, Running low, or Out; optionally enter quantity/unit. Setup can be skipped. Relevant pantry items can be reviewed during shopping preparation. |
| PAN-02 | Honest pantry subtraction | Only subtract compatible known quantities. Have it without a quantity requires confirmation that there is enough; Running low stays on the review list. Display the last-confirmed date and allow corrections. |
| GRO-01 | Deterministic grocery calculation | Combine compatible ingredient amounts across meals, apply servings and protein choices, subtract confirmed pantry coverage, clamp shortages at zero, and retain traceability to contributing meals. |
| GRO-02 | Ambiguity handling | Different preparations may share a canonical ingredient; materially different forms remain separate. Unsupported volume/weight conversions, unknown quantities, and ambiguous mappings require review. Never infer density or package size silently. |
| GRO-03 | Manual control | Users may add extras, change quantities, exclude an item for this trip, and restore it. Editing a meal recalculates the list and visibly flags overrides that need rechecking. |
| SHOP-01 | Store selection and connection | User connects the retailer separately from app sign-in and selects a supported location/fulfillment method. Reconnecting does not erase the plan. Disconnect revokes/deletes local credentials as supported. |
| SHOP-02 | Product matching | Show actual candidate product, brand, package size, requested amount, pack count, and available price with retrieval time. User can replace a match; unresolved ingredients stay visible. |
| SHOP-03 | Review before submission | Review the exact products and pack counts. Missing prices remain labeled unknown; totals are estimates excluding unknown prices, taxes, fees, and unverified discounts. Any plan, pantry, or product edit invalidates the previous approval. |
| SHOP-04 | Reliable cart submission | Explicit action submits a frozen reviewed draft. Repeated clicks cannot create concurrent submissions of that draft. Show confirmed API outcomes separately from ambiguous ones. On a timeout after possible acceptance, do not automatically resend; direct the user to inspect the retailer cart. |
| SHOP-05 | Retailer handoff | After submission, link to the retailer for cart inspection, substitutions, fulfillment scheduling, and checkout. Do not claim an authoritative cart total or completed order without supporting API evidence. |
| COOK-01 | Pantry updates | Mark a meal cooked; preview and confirm deductions for tracked amounts. Unknown quantities remain unknown; undo restores the previous state. Planning or cart submission alone never consumes or replenishes pantry stock. |
| PRINT-01 | Useful offline output | Print the selected week's meals, scaled ingredients, cooking steps, and shopping list in clearly separated sections, including protein choices. Verify US Letter output and page breaks; controls and navigation are hidden. |
| DEMO-01 | Immediate sample experience | Try a sample household without sign-up, using isolated sample data. Clearly label simulated prices/cart actions. Reset restores the sample; no live retailer writes or shared private data are reachable. |

Example calculation fixture: two meals need a combined 900 g of an ingredient, 200 g is confirmed in the pantry, and the selected product contains 400 g per pack. Shortage is 700 g; purchase is two packs. Unknown package size must block automatic pack calculation.

## 6. Assistant behavior

Example request: “Plan three quick dinners using my spinach and chickpeas, and prepare the missing groceries.”

The assistant may read the household's pantry, preferences, and recipe library; propose a structured weekly plan; calculate groceries through application code; search supported products; and prepare a shopping draft. The interface shows the proposed meals and an understandable summary of choices, with editable results.

- User acceptance is required before replacing a saved plan. Shopping submission requires its own explicit approval of the current draft.
- Quantity arithmetic, supported conversions, and package rounding are deterministic functions.
- Hard user constraints are validated against known recipe/product metadata. If data is insufficient, report uncertainty rather than asserting compliance.
- Recipe text, product descriptions, and user notes are data, never tool authorization.
- Tool calls are scoped to the authenticated household and validated server-side.
- Bound execution by tool-call, time, and token limits; proposed starting limits are 10 calls and 30 seconds per run, to be tuned from measurement.
- On model/provider failure, preserve edits and offer the ordinary planning flow.
- Store concise action outcomes and timings, not hidden model reasoning. Redact credentials and avoid unnecessary personal data in logs.

Evaluation set: at least 20 versioned scenarios covering pantry use, serving changes, ingredient ambiguity, impossible constraints, malformed tool arguments, provider failure, and attempted unapproved writes. Require zero unauthorized writes and complete passage of deterministic calculation tests. Record model/configuration, tool success, latency, and cost; set recommendation-quality thresholds after a baseline evaluation.

## 7. Experience and visual direction

Proposed design: a calm, food-focused workspace with clear recipe imagery where available, strong typography, generous spacing, and an obvious next step. Support mobile shopping and desktop planning equally.

Primary areas: **This Week, Recipes, Pantry**. Shopping review opens from the weekly plan. Keep settings and connection management secondary.

The weekly screen pairs selected meal cards with a concise grocery summary. The review screen distinguishes Needed, Covered by pantry, and Needs attention. Use explicit loading, empty, saved, and failure states. Avoid presenting a long chat transcript as the main navigation.

Validate keyboard operation, visible focus, labeled inputs, contrast, and screen-reader announcements for saving and shopping status. Check layouts at 375 px and 1440 px with no horizontal overflow. Prototype the weekly screen and shopping review before broad UI implementation.

## 8. Proposed technical direction

Keep the deployable frontend static where practical; use TypeScript modules/components as the UI grows. Proposed frontend: React with Vite. Proposed persistence: Supabase Auth and Postgres, with database-enforced household access rules. Use server-side functions for retailer OAuth, secrets, AI calls, and external writes. Final framework choice belongs in a short architecture decision record before M1.

Logical entities:

- Households and membership (one member initially), preferences, recipes and recipe versions.
- Canonical ingredients, aliases, recipe ingredients, supported unit conversions.
- Weekly plans and meal snapshots, pantry entries and adjustment history.
- Shopping drafts and items, retailer connections, location-specific product mappings.
- Submission attempts and outcomes, assistant runs and usage summaries.

Use a retailer adapter with explicit capabilities for location search, product search, cart addition, and shopping-link creation. Only implement validated methods; a link handoff must not masquerade as cart mutation. Saved product preferences must be scoped by household, retailer, and relevant location, and refreshed before reuse.

Version drafts and protect against stale edits. Persist submission intent before calling a retailer. Application deduplication prevents known repeats but cannot guarantee exactly-once delivery when the upstream API has no idempotency/reconciliation capability; model an explicit unknown outcome.

## 9. Deployment, cost, and operational requirements

- Separate development/demo/live credentials. Never place retailer secrets or privileged database keys in browser assets.
- Use versioned database migrations, reproducible seed data, CI checks, and a documented deployment/rollback procedure.
- Publish a deployed URL and setup instructions; capture a backup demo video for interview reliability.
- Track errors, integration latency, assistant usage, and estimated model cost per run. Redact tokens and sensitive payloads.
- Rate-limit public endpoints. Use a fixed sample flow by default; any public live AI access needs per-session limits and a global cap.
- Target $0 fixed recurring infrastructure cost and at most $10/month total operating spend. Proposed allocation: at most $5/month for model usage, with $5 headroom for other service costs. Use free provider subdomains initially. Any paid plan exceeding the ceiling requires a scope/budget revision.
- Enforce model quotas server-side, reserve a conservative maximum call cost before dispatch, and reconcile actual usage afterward. Refuse new paid calls when the remaining allowance cannot cover them; bound concurrency and output size. Disable paid AI while preserving manual planning. Provider budget alerts alone are insufficient.
- Default public demos use sample products and deterministic assistant responses, clearly labeled. Keep a separate recorded live demonstration and owner-only live AI workflow; public live AI is optional and must share the same global spending ceiling.
- Provide account-data deletion and retailer disconnect. Document backup/restore expectations and test restoration before storing data the owner relies on.
- Verify production availability before interviews. Free hosting/database inactivity behavior is part of the deployment decision. Keep the static sample demo available without the database and document how to restore a paused free database for live use; do not assume a paid upgrade fits the budget.

## 10. Verification and release evidence

- Unit tests for aggregation, conversions, servings, pantry subtraction, package rounding, and override handling.
- Database/API tests for cross-household isolation, stale draft approval, duplicate clicks, expired retailer authorization, and ambiguous submission outcomes.
- Browser tests for sign-in, persistence, planning, pantry review, print/export, and the complete sample demo.
- Contract fixtures for retailer responses, plus a separately authorized live smoke test at the selected store.
- Assistant evaluations described above; a user-facing failure path for every external dependency.
- Manual mobile/desktop, keyboard, and print checks.

Portfolio evidence should show the user problem, working deployed flow, architecture, integration constraints, evaluation results, observed costs, and one real failure/recovery example. Tie technical decisions to user outcomes. Record actual results after use rather than inventing impact metrics.

## 11. Integration evidence and limitations

Reviewed September 21, 2026. These links support feasibility research; successful local-store account testing remains required.

- [Kroger official public API collection](https://www.postman.com/kroger/the-kroger-co-s-public-workspace/documentation/ki6utqb/kroger-public-apis?entity=request-4833726-295916ed-4bc0-4636-af8f-509ab184b30b): documents location/product lookup and authenticated cart addition. Treat unsupported cart reads, removals, checkout, and reconciliation as unavailable unless verified. King Soopers account/location behavior and current quotas/costs remain open.
- [Kroger add-to-cart reference](https://www.postman.com/kroger/the-kroger-co-s-public-workspace/request/mwiie4o/add-to-cart): basis for the proposed direct cart workflow.
- [Instacart shopping-list API](https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page/): creates a hosted shoppable-list link; users select a store and complete shopping there. This is a fallback capability with different UX, not a direct-cart substitute.
- [Instacart onboarding](https://docs.instacart.com/developer_platform_api/get_started/overview): currently estimates approximately 30–40 days through demo approval and production access. Verify access and commercial terms before committing.
- [Walmart developer portal](https://developer.walmart.com/): reviewed offerings did not establish an accessible consumer grocery-cart integration for this use case. Defer pending affirmative evidence.
- [Amazon Business Cart API](https://docs.business.amazon.com/docs/cart-api-overview): business purchasing API; does not establish support for consumer Amazon Grocery/Fresh carts.
- [Supabase pricing](https://supabase.com/pricing): currently offers a free tier and Pro starting at $25/month. Free projects pause after one week of inactivity. Other services and usage may add cost.

## 12. Decision log and next iteration

| Decision | Status | Rationale / next action |
| --- | --- | --- |
| Persistent planner, pantry, printing, grocery preparation | Confirmed direction | Directly supports weekly personal use. |
| Kroger/King Soopers as first live retailer | Proposed, feasibility gated | Nearby option with a documented public cart API; prove the local account path. |
| Human review and retailer checkout | Proposed | Delivers useful automation with clear control and a bounded initial scope. |
| Forward-deployed engineering portfolio emphasis | Confirmed | Emphasize integration discovery, deployment, operational recovery, and measured user outcomes. |
| Monthly operating budget | Confirmed: aim for free; maximum $10/month | Free infrastructure, bounded owner AI usage, and a deterministic public demo by default. |
| Coarse pantry states plus optional quantities | Confirmed | Have it / Running low / Out, optional quantities, and a quick review before shopping. Validate usability during the first weekly-use sessions. |
| React/Vite + Supabase + server-side integrations | Proposed | Keep operational complexity low; record final tradeoffs before implementation. |
| Sample household without registration | Proposed | Make the product easy to evaluate independently of provider access. |

Next implementation work should establish the first three-screen flow within the confirmed forward-deployed engineering focus and $10/month ceiling. Implement against milestone acceptance criteria, updating this PRD when scope or verified provider behavior changes.

## 13. Implementation kickoff

The PRD is sufficient to start the core planner. Retailer feasibility gates live shopping, not the rest of the application.

1. Record the architecture decision: proposed React/Vite/TypeScript frontend, Supabase persistence/auth, and server-side integrations. Inspect existing deployment configuration and preserve the current app while the replacement is built.
2. Prototype This Week, Pantry, and Grocery Review with existing recipe content and the sample household. Validate mobile layout and the print flow before expanding the design.
3. Implement and test the grocery calculation module, then connect the screens to a repository/data-access layer that supports sample data and authenticated persistence.
4. Create database migrations, household isolation policies, recipe import, and sign-in. Provision the free backend and configure deployment secrets when ready to test real cross-device persistence.
5. Deliver the first end-to-end slice: sign in, select three meals, mark pantry coverage, review missing groceries, reload on another browser, and print the week.
6. In parallel with core development, obtain retailer developer access and run M0. Store credentials in local/deployment secret settings, never in the PRD or committed source. Validate the chosen King Soopers location and fulfillment mode before starting live cart implementation.

Owner input needed for live setup: access to the selected backend/deployment accounts, a retailer developer application and shopper account, and the preferred store/fulfillment method. These do not block building the sample experience or calculation logic. Do not ask the owner to paste secret keys into conversation.

Initial implementation completion means the M1 slice works with real saved data and printing; retailer shopping and the assistant remain subsequent milestones. Visual direction can be iterated against working screens rather than requiring a complete design specification upfront.
