# Recipe Addition Instructions

This file is the source of truth for how new recipes are added to `recipes.json`. Reference it every time a recipe is being added, generated, or suggested.

---

## How Recipes Get Added

New recipes come from two paths:

**1. Sync from `recipe-links.md`** — The primary method. When asked to "sync recipes from my list," Claude will:
1. Run the tried-it check first (see Favorites & Feedback Workflow below)
2. Read `recipe-links.md` and collect all rows with status `pending`
3. Cross-check each URL's recipe name/ID against existing entries in `recipes.json` — skip any that already exist
4. Fetch and extract each new recipe from the URL, applying all rules in this file
5. Write the new recipes to `recipes.json`
6. Update the status of each processed row in `recipe-links.md` to `imported`

**2. On-demand** — When asked to "add N new recipes," Claude researches and writes recipes directly without a link list, following all the same rules.

In both cases, the tried-it check runs first, the exclusion list is checked, and the full JSON schema is used.

---

## Core Philosophy

Every recipe in this collection should feel like something worth cooking again — not filler. The bar is: fast enough for a weeknight, actually delicious, and backed by a real recipe someone has tested and loved.

---

## Non-Negotiable Requirements

### Time
- **15–30 minutes** active cook time only. No exceptions.
- "Active" means hands-on time. Passive simmering or oven time that doesn't require attention is fine as long as the active portion stays within range.

### Source & Quality
- Must come from a **real, reputable source**: a well-known food blog, cookbook author, publication, or a classic technique with broad consensus.
- Prefer recipes with strong community validation — high ratings, large review counts, widespread popularity.
- Acceptable sources include (but are not limited to): Love & Lemons, Cookie & Kate, The Kitchn, Smitten Kitchen, Half Baked Harvest, Nora Cooks, Bon Appétit, NYT Cooking, serious home-cook techniques with wide recognition.
- The `source` field must always be filled in. Use the domain (e.g. `loveandlemons.com`) or a descriptive label (e.g. `classic Italian technique`).
- **Never invent a recipe from scratch** without grounding it in a real source or well-established technique.

### Vegetarian Base
- Every recipe must be **fully vegetarian as written**. No meat in the base recipe.
- Eggs and dairy are allowed.
- The dish should be satisfying on its own without the protein add-ons.

### Protein Add-Ons
- Every recipe must include a **`proteins` array** with exactly **3 add-on options**.
- Each protein is cooked separately (never mixed in) so vegetarians and meat-eaters can share the same base.
- Add-on instructions should be concise and self-contained — someone should be able to execute them without reading anything else.
- Proteins should vary: aim for at least one red meat, one poultry or seafood, and one that could work as a vegetarian boost (e.g. tofu, extra beans, halloumi, chickpeas). Exceptions are fine if the cuisine doesn't call for it.

---

## Cuisine Buckets

New recipes can be added to existing buckets or new ones. Current buckets:

| Bucket ID | Label         |
|-----------|---------------|
| `mx`      | Mexican       |
| `med`     | Mediterranean |
| `it`      | Italian       |
| `as`      | Asian         |
| `am`      | American      |

New cuisine buckets are welcome as long as the recipe meets all other requirements. When creating a new bucket, assign a short 2–3 character `bucket` ID and a clear `bucketLabel`.

---

## Recipe JSON Format

Each recipe must strictly follow this structure:

```json
{
  "id": "kebab-case-id",
  "name": "Human-Readable Name",
  "bucket": "bucket-id",
  "bucketLabel": "Cuisine Name",
  "time": 25,
  "servings": 4,
  "leftovers": true,
  "description": "One or two sentences. What makes this dish great and where it comes from.",
  "source": "source.com or descriptive label",
  "ingredients": [
    { "id": "i1", "name": "ingredient name", "amount": 1, "unit": "cup", "category": "pantry|produce|dairy|grains" }
  ],
  "steps": [
    "Step one...",
    "Step two..."
  ],
  "proteins": [
    { "name": "Protein name", "amount": "1 lb", "instructions": "How to cook it and add to the dish." },
    { "name": "Protein name", "amount": "8 oz", "instructions": "..." },
    { "name": "Protein name", "amount": "14 oz", "instructions": "..." }
  ]
}
```

### Field notes
- `id`: lowercase, hyphenated, unique across all recipes
- `time`: integer, in minutes, active cook time only
- `leftovers`: `true` if the recipe holds well overnight, `false` if best eaten fresh
- `ingredients[].category`: must be one of `pantry`, `produce`, `dairy`, `grains`
- `ingredients[].unit`: use `null` for whole items (e.g. an avocado, a lemon)
- `steps`: written in second person, imperative. Each step is a complete action.
- Ingredient IDs (`i1`, `i2`, ...) reset per recipe — they are local identifiers only.

---

## Ingredient Exclusion Rules

Before finalizing any recipe, check the exclusion list in `prefs.json` under `ingredientExclusions`.

Each exclusion has the following structure:
```json
{
  "ingredient": "bok choy",
  "substitute": "napa cabbage",
  "annotation": "(substituted for bok choy)"
}
```

**When a recipe contains an excluded ingredient:**
1. Swap it for the listed substitute.
2. Append the annotation to the ingredient name in the `name` field — e.g. `"napa cabbage (substituted for bok choy)"`.
3. Do not otherwise alter the recipe — keep amounts and categories the same unless the substitute clearly requires an adjustment.
4. If no good substitute exists, skip the recipe and suggest an alternative.

---

## Favorites & Feedback Workflow

When adding new recipes, **first run the tried-it check**:

1. Display the current recipe list (by name) and ask: "Have you tried any of these? Any you'd like to remove or mark as a favorite?"
2. For recipes the user **loved**: add `"favorite": true` to the recipe object in `recipes.json`, and add the recipe ID to the `favorites` array in `prefs.json`.
3. For recipes the user **didn't like**: add the recipe ID to the `disliked` array in `prefs.json`. Do not delete the recipe from `recipes.json` — keep it as a record.
4. After the check, proceed with adding new recipes.

Favorites remain in their original cuisine bucket. The `favorite: true` field allows the app to surface them separately.

---

## Style & Tone

- **Descriptions** should be appetizing and specific — name what makes the dish great, not just what's in it. One to two sentences max.
- **Steps** are written in second person and imperative ("Heat oil...", "Add garlic..."). Each step is a meaningful action — don't split micro-steps or over-consolidate.
- **Protein instructions** are self-contained: someone cooking just the add-on should be able to read only that field and succeed.
- Keep the overall tone practical and confident — this is a working recipe file, not a food magazine.
