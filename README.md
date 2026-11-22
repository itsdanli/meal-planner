# Weeknight Planner

A personal meal-planning web app. Plan the week's breakfasts, lunches and dinners, track what's in your pantry, get recipe suggestions from what you have, and export a shopping list that accounts for pantry coverage and recipe scaling.

The app lives in [`app/`](app/README.md) (React, TypeScript, Vite) with an optional Supabase backend for sign-in and cross-device saving. Without Supabase credentials it runs as a local sample household saved in the browser.

## Run it locally

```sh
cd app
npm install
npm run dev      # http://127.0.0.1:5173
npm test
npm run build
```

To enable sign-in, copy `app/.env.example` to `app/.env.local` and fill in the Supabase project URL and publishable key.

## Repository layout

| Path | Purpose |
|------|---------|
| `app/` | The application: source in `src/`, recipe photos in `public/recipe-images/`, build and deploy scripts in `scripts/`. |
| `recipes.json`, `daytime-recipes.json`, `daytime-recipe-expansion.json` | Dinner, breakfast and lunch recipes. Imported by `app/src/data.ts`. |
| `cocktails.json`, `smoker-recipes.json`, `smoothies.json` | Other recipe sections. Imported by `app/src/library.ts`. |
| `recipe-images.json` | Photo manifest with source, author and license for each image. |
| `prefs.json` | Recipe-authoring memory (disliked recipes, ingredient substitutions). Not read by the app. |
| `recipe-links.md`, `*-INSTRUCTIONS.md` | Workflow for adding recipes to the JSON files with Claude. |
| `amazon-products.json` | Product memory for the Amazon grocery-shopper skill. Not read by the app. |
| `supabase/migrations/` | Database schema and row-level security. |
| `docs/` | PRD, architecture, backend, and deployment notes. |
| `AGENTS.md`, `system-prompt.md` | Instructions for AI agents working in this repo. |

The recipe JSON files are bundled into the app at build time, so editing one means rebuilding and redeploying.

## Adding recipes

Follow [`system-prompt.md`](system-prompt.md): add URLs to `recipe-links.md`, then ask Claude to sync them. Every new recipe also needs a photo, handled by `npm --prefix app run images:fetch` (see `AGENTS.md`).

## Deployment

- GitHub Pages: `npm run deploy` from `app/` (see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)).
- Cloudflare Workers Static Assets: see [`docs/CLOUDFLARE.md`](docs/CLOUDFLARE.md).
- Database setup and auth redirect URLs: [`docs/BACKEND.md`](docs/BACKEND.md).
