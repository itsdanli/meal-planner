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

## Pantry matching and navigation — October 12, 2026

The first pantry enhancement keeps the existing React/Vite, JSON library, and household Supabase architecture. This week is a standalone navigation destination; Recipes, Pantry, and Groceries are grouped under Manage. Groceries has a single shopping list with inline questions, plus items whose coverage is confirmed. Exported shopping notes retain those questions.

`app/src/ingredients.ts` owns reviewed food identities, search aliases, explicit recipe alternatives, and optional ingredient recognition. `data.ts` enriches every bundled dinner ingredient with a derived identity and optional flag without rewriting its original wording. Unknown names retain an exact, namespaced identity; they are not guessed or silently replaced. This is a starter catalog, not a complete taxonomy. Adding aliases requires reviewing food forms and incrementing `INGREDIENT_RULES_VERSION` when released matching semantics change.

Suggestions use the shared identity rules, omit explicitly optional extras, and require pantry tags for salt and pepper. Salt and pepper alone do not trigger recommendations. Results group into Ingredients on hand, Check what remains, Almost there (one or two missing requirements), and More ideas. These are presence-based results, not a guarantee of enough food. Recipe cards state their base servings; protein add-ons and quantities are checked when planning. There are no generated recipes or inferred substitutions. Explicit alternatives already written into a recipe can match either reviewed option.

Grocery recognition uses the same aliases, but arithmetic still preserves the legacy quantity/form groups. Recognizing garlic does not convert a head to cloves, and canned beans do not establish a can size. Mass conversions use the existing unit rules; volume across different aliases is limited to reviewed liquid identities. Known stock is budgeted across the entire plan, so separate recipe aliases cannot each consume the full pantry amount. Ambiguous combinations and alternatives need confirmation before subtracting stock. Optional extras and water/ice are excluded from required groceries; original recipe instructions remain intact.

### Saved-data compatibility

No SQL migration is required. Existing pantry labels, canonical storage keys, row IDs, revision guards, and household isolation are retained. The legacy `canonicalIngredient` function remains the persisted-key and quantity-group contract; do not replace it with display catalog IDs without a deliberate migration. Catalog identities are derived at runtime, so older snapshots and custom labels remain usable.

Browser saves record the ingredient rules version in the existing local storage entry. Older saves preserve meals, names, statuses, and quantities but clear prior coverage confirmations once. Cloud coverage fingerprints include the rules version and optional-ingredient metadata, so old confirmations become ineffective without rewriting saved pantry rows. Users can explicitly reconfirm current requirements. New pantry tags reuse an existing food alias and can restore an Out item; existing distinct saved rows are not automatically merged or discarded.

### Deferred work

Expand the reviewed catalog, add quantity-verified Ready to cook results and a recipe-specific substitution model, and consider a shared database catalog only when publishing workflows require it. Generic or unreviewed names currently match exactly. Live authenticated save/reload and cross-account isolation testing remain separate from local unit and browser verification.
