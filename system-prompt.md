# Meal Planner — System Prompt

This file is the authoritative context document for this project. Read it at the start of every new session before doing any work. **Any time you make a structural change to this system (new files, new schema fields, new sections, changed workflows), update this file to reflect it.**

Last updated: 2026-06-14

---

## Project Overview

A single-file HTML/CSS/JS meal planning app. No build step, no framework. All data lives in JSON files alongside `index.html`. The app is opened directly in a browser (file:// or local server).

**Folder:** `/Users/danli/Library/Mobile Documents/com~apple~CloudDocs/Code/meal-planner/`

---

## File Map

| File | Purpose |
|------|---------|
| `index.html` | Single-file app — all HTML, CSS, JS |
| `recipes.json` | Weeknight dinner recipes (25+) |
| `cocktails.json` | Cocktail recipes (10+) |
| `smoker-recipes.json` | Traeger/smoker recipes |
| `smoothies.json` | Smoothie recipes |
| `prefs.json` | User preferences (favorites, disliked, proteins, exclusions) |
| `current-week.json` | Persisted this-week meal selection |
| `recipe-links.md` | Master import list — URLs to sync into data files |
| `RECIPES-INSTRUCTIONS.md` | Rules for adding weeknight recipes |
| `COCKTAILS-INSTRUCTIONS.md` | Rules for adding cocktails |
| `SMOKER-INSTRUCTIONS.md` | Rules for adding smoker recipes |
| `SMOOTHIES-INSTRUCTIONS.md` | Rules for adding smoothies |
| `system-prompt.md` | This file |

---

## App Sections (Tabs)

| Tab Label | data-view | Section ID | Data Source |
|-----------|-----------|------------|-------------|
| This Week | `week` | `view-week` | `recipes.json` + `current-week.json` |
| Recipe Library | `library` | `view-library` | `recipes.json` |
| Favorites | `favs` | `view-favs` | `recipes.json` + `prefs.json` |
| Cocktails | `cocktails` | `view-cocktails` | `cocktails.json` |
| Smoker | `smoker` | `view-smoker` | `smoker-recipes.json` |
| Smoothies | `smoothies` | `view-smoothies` | `smoothies.json` |

Tab switching: `data-view="X"` on `<button class="nav-btn">` → `id="view-X"` on `<section class="view">`. One shared click handler.

---

## Key UI Patterns

- **Collapsible folders** group recipes by cuisine/bucket. Collapsed state tracked in `Set()` per section.
- **Modals**: `openModal(id)` / `closeModal(id)`. Backdrop click and ESC close all modals.
- **Cards**: `.rcard` for recipes, `.ccard` (reused) for cocktails, smoker, and smoothies.
- **Filter pills** + search bar in each section. Flat mode (no folders) when searching.
- **No "Add Recipe" button** in the UI. All additions happen via Claude + JSON files.

---

## Data Schemas

### `recipes.json` — Weeknight Recipes
```json
{
  "id": "kebab-case",
  "name": "...",
  "bucket": "mx|med|it|as|am",
  "bucketLabel": "Mexican|Mediterranean|Italian|Asian|American",
  "time": 25,
  "servings": 4,
  "leftovers": true,
  "description": "...",
  "source": "domain.com",
  "favorite": true,
  "ingredients": [{ "id": "i1", "name": "...", "amount": 1, "unit": "cup", "category": "pantry|produce|dairy|grains" }],
  "steps": ["..."],
  "proteins": [{ "name": "...", "amount": "1 lb", "instructions": "..." }]
}
```
- 15–30 min active cook time. Vegetarian base. Exactly 3 protein add-ons per recipe.
- Full rules: `RECIPES-INSTRUCTIONS.md`

### `cocktails.json` — Cocktails
```json
{
  "id": "kebab-case",
  "name": "...",
  "bucket": "summer|year-round|party",
  "bucketLabel": "Summer|Year-Round|Party / Batch",
  "description": "...",
  "source": "...",
  "servings": 1,
  "glassware": "Rocks glass",
  "difficulty": "easy|medium",
  "ingredients": [{ "id": "i1", "name": "...", "amount": 2, "unit": "oz" }],
  "steps": ["..."],
  "mocktail": { "description": "..." }
}
```
- No `time`, `leftovers`, `proteins`, or ingredient `category`.
- `mocktail` omitted entirely if no good non-alcoholic version.
- Full rules: `COCKTAILS-INSTRUCTIONS.md`

### `smoker-recipes.json` — Smoker / Traeger
```json
{
  "id": "kebab-case",
  "name": "...",
  "bucket": "beef|pork|poultry|seafood|sides",
  "bucketLabel": "Beef|Pork|Poultry|Seafood|Sides & Veggies",
  "prepTime": 20,
  "smokeTime": 360,
  "smokeTemp": 225,
  "internalTemp": 203,
  "wood": "Oak or Hickory",
  "servings": 6,
  "leftovers": true,
  "difficulty": "beginner|intermediate|advanced",
  "description": "...",
  "source": "...",
  "ingredients": [{ "id": "i1", "name": "...", "amount": 2, "unit": "lbs" }],
  "steps": ["..."],
  "tips": ["..."]
}
```
- No vegetarian-base requirement. No `proteins` array. `internalTemp` can be `null`.
- Full rules: `SMOKER-INSTRUCTIONS.md`

### `smoothies.json` — Smoothies
```json
{
  "id": "kebab-case",
  "name": "...",
  "bucket": "protein|green|fruit|tropical",
  "bucketLabel": "Protein|Green|Fruit|Tropical",
  "time": 5,
  "servings": 1,
  "description": "...",
  "source": "...",
  "tags": ["vegan", "dairy-free"],
  "ingredients": [{ "id": "i1", "name": "...", "amount": 1, "unit": "cup" }],
  "steps": ["..."]
}
```
- No `leftovers`, `proteins`, or ingredient `category`. 10 min max.
- Full rules: `SMOOTHIES-INSTRUCTIONS.md`

### `prefs.json`
```json
{
  "favorites": ["recipe-id"],
  "disliked": ["recipe-id"],
  "chosenProteins": { "recipe-id": 0 },
  "ingredientExclusions": [
    { "ingredient": "bok choy", "substitute": "napa cabbage", "annotation": "(substituted for bok choy)" }
  ]
}
```

---

## `recipe-links.md` — Import Workflow

Table format: `| URL | Notes | Category | Status |`

**Category values route imports to the correct JSON file:**

| Category | Target file |
|----------|-------------|
| *(blank)* | `recipes.json` |
| `asian`, `med`, `mx`, `it`, `am` | `recipes.json` (sets bucket) |
| `smoker` | `smoker-recipes.json` |
| `smoothie` | `smoothies.json` |
| `cocktail` | `cocktails.json` |

**Status values:** `pending` · `imported` · `skip`

**Sync workflow:** When asked to "sync recipes from my list":
1. Read `recipe-links.md`, collect all `pending` rows.
2. Route each URL to the correct file based on Category.
3. Run the tried-it check first (weeknight recipes only).
4. Cross-check against existing entries — skip duplicates.
5. Extract, apply all rules from the relevant instructions file.
6. Write to the correct JSON file.
7. Mark each processed row `imported`.

---

## Core Workflows

### Adding Weeknight Recipes
1. Run tried-it check: show recipe list, ask for favorites (add `favorite:true` + update `prefs.json`) and dislikes (add to `disliked` array).
2. Check `ingredientExclusions` in `prefs.json` — swap excluded ingredients, append annotation.
3. Follow `RECIPES-INSTRUCTIONS.md` for schema and requirements.

### Adding to Other Sections
- Cocktails: follow `COCKTAILS-INSTRUCTIONS.md` → write to `cocktails.json`.
- Smoker recipes: follow `SMOKER-INSTRUCTIONS.md` → write to `smoker-recipes.json`.
- Smoothies: follow `SMOOTHIES-INSTRUCTIONS.md` → write to `smoothies.json`.

### Adding New Tabs / Sections
1. Create `<section-name>.json` with appropriate schema.
2. Create `SECTION-INSTRUCTIONS.md` with sourcing and schema rules.
3. Add nav button `<button class="nav-btn" data-view="X">` to `index.html`.
4. Add view section `<section class="view" id="view-X">` with search + filter pills + grid.
5. Add modal HTML.
6. Add JS state, constants, render function, detail function, and event listeners.
7. Add fetch in `init()` and call in `renderAll()`.
8. Add Category routing to `recipe-links.md` table.
9. **Update this file.**

---

## Non-Negotiables (All Sections)

- Never invent a recipe without grounding it in a real, reputable source.
- `source` field must always be filled in.
- IDs are lowercase, hyphenated, and unique within their file.
- Steps are second-person imperative.
- Never delete a disliked weeknight recipe from `recipes.json` — only add to the `disliked` array in `prefs.json`.

---

## Current Data State

- **Weeknight recipes:** 25 recipes across 5 buckets (mx, med, it, as, am)
- **Cocktails:** 10 cocktails across 3 buckets (summer, year-round, party)
- **Smoker recipes:** 3 starter recipes (spatchcock chicken, 3-2-1 ribs, smoked salmon)
- **Smoothies:** 4 starter recipes (green power, strawberry protein, tropical mango, blueberry açaí)
- **Disliked:** `garlic-noodle-stir-fry`
- **Ingredient exclusions:** bok choy → napa cabbage
- **Favorites:** none set yet

---

## Change Log

| Date | Change |
|------|--------|
| 2026-06-14 | Added Smoker tab (`smoker-recipes.json`, `SMOKER-INSTRUCTIONS.md`) |
| 2026-06-14 | Added Smoothies tab (`smoothies.json`, `SMOOTHIES-INSTRUCTIONS.md`) |
| 2026-06-14 | Added Category column to `recipe-links.md` for import routing |
| 2026-06-14 | Created this file |
| 2026-06-14 | Added Cocktails tab (`cocktails.json`, `COCKTAILS-INSTRUCTIONS.md`) |
| 2026-06-14 | Removed Add Recipe UI button; added `recipe-links.md` sync workflow |
| 2026-06-14 | Added `prefs.json` (favorites, disliked, exclusions) |
| 2026-06-14 | Created `RECIPES-INSTRUCTIONS.md` |
