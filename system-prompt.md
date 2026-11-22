# Meal Planner — System Prompt

Context document for AI agents working in this repo. Read it at the start of a session. When you make a structural change (new data files, schema fields, sections, or workflows), update this file.

Last updated: 2026-11-22

---

## Project Overview

Weeknight Planner is a React + TypeScript + Vite app in `app/`, with an optional Supabase backend (auth, household-scoped plans and pantry). Recipe content lives in JSON files in the repository root and is imported into the app at build time. The earlier single-file `index.html` site has been removed.

See `README.md` for the layout, `docs/ARCHITECTURE.md` for design decisions, and `docs/DEPLOYMENT.md` / `docs/CLOUDFLARE.md` for hosting.

---

## Data Files (repo root)

| File | Consumed by | Contents |
|------|-------------|----------|
| `recipes.json` | `app/src/data.ts` | Weeknight dinners |
| `daytime-recipes.json`, `daytime-recipe-expansion.json` | `app/src/data.ts` | Breakfast and lunch recipes (`mealType`) |
| `cocktails.json` | `app/src/library.ts` | Cocktails |
| `smoker-recipes.json` | `app/src/library.ts` | Smoker / Traeger recipes |
| `smoothies.json` | `app/src/library.ts` | Smoothies |
| `recipe-images.json` | `app/src/library.ts`, `app/scripts/fetch-recipe-images.mjs` | Photo manifest with attribution |
| `prefs.json` | Authoring workflow only | Disliked recipe IDs, ingredient exclusions/substitutions, favorites |
| `recipe-links.md` | Authoring workflow only | Import queue of recipe URLs |
| `amazon-products.json` | Amazon grocery-shopper skill only | Remembered product matches |

Photos live in `app/public/recipe-images/`.

---

## Adding Recipes

1. Add URLs to `recipe-links.md` with a Category and status `pending`, or ask for new recipes directly.
2. Follow the instructions file for the target section: `RECIPES-INSTRUCTIONS.md` (dinners), `COCKTAILS-INSTRUCTIONS.md`, `SMOKER-INSTRUCTIONS.md`, `SMOOTHIES-INSTRUCTIONS.md`. Schemas and rules for each live there.
3. Check `prefs.json` first: skip disliked recipes, apply `ingredientExclusions`.
4. Run the image workflow in `AGENTS.md` for every new recipe.
5. Run `npm test` and `npm run build` from `app/`. Tests validate the catalog, so a malformed recipe fails the build.
6. Mark processed rows in `recipe-links.md` as `imported`.

Category routing in `recipe-links.md`: blank, `asian`, `med`, `mx`, `it`, `am` go to `recipes.json`; `smoker`, `smoothie` and `cocktail` go to their own files.

---

## Non-Negotiables

- Never invent a recipe without grounding it in a real, reputable source; always fill `source`.
- IDs are lowercase, hyphenated, and unique within their file.
- Steps are second-person imperative.
- Never delete a disliked recipe from the data files; record it in `prefs.json` `disliked`.
- No runtime image searches or network downloads during page load or production builds.
- Never put a database password, secret key or service-role key in the repo or in a `VITE_` variable.
