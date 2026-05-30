# Cocktail Addition Instructions

This file is the source of truth for how new cocktails are added to `cocktails.json`. Reference it every time a cocktail is being added or suggested.

---

## How Cocktails Get Added

Cocktails can be added two ways:

**1. On-demand** — "Add N new cocktails" → research real recipes, apply rules below, write to `cocktails.json`.

**2. From a link list** — If a `cocktail-links.md` file exists, use the same sync workflow as `recipe-links.md`: read pending URLs, skip imported ones, extract and write, mark imported.

---

## Core Philosophy

Every cocktail should be worth making again. The bar is: genuinely delicious, well-sourced, and reproducible at home without special equipment. Prefer classics and crowd-tested recipes over novelty.

---

## Non-Negotiable Requirements

### Sources
- Must come from a real, reputable source: a well-known cocktail guide, spirits publication, bartender, or a classic with broad consensus.
- Acceptable sources: Difford's Guide, Serious Eats, NYT Cooking, Death & Co, Imbibe Magazine, Punch Drink, classic proportions with wide agreement.
- The `source` field must always be filled in.

### Complexity
- A mix of easy (5 min, ≤5 ingredients) and medium (infusions, multi-step builds, batch scaling) is welcome.
- No cocktails requiring obscure equipment or ingredients unavailable at a good liquor store.

### Mocktail policy
- Include a `mocktail` field **only when the non-alcoholic version is actually good** — not a watered-down afterthought.
- If no natural substitute exists, omit the field entirely.

---

## Buckets

| Bucket ID | Label | Examples |
|-----------|-------|---------|
| `summer` | Summer | Spritzes, highballs, frozen drinks, gin & tonics, mojitos |
| `year-round` | Year-Round | Classics: margarita, negroni, old fashioned, whiskey sour |
| `party` | Party / Batch | Pitcher margaritas, sangria, punches — makes 6+ servings |

---

## Cocktail JSON Schema

```json
{
  "id": "kebab-case-id",
  "name": "Human-Readable Name",
  "bucket": "summer | year-round | party",
  "bucketLabel": "Summer | Year-Round | Party / Batch",
  "description": "One to two sentences. What makes it great and where it's from.",
  "source": "source.com or descriptive label",
  "servings": 1,
  "glassware": "Rocks glass",
  "difficulty": "easy | medium",
  "ingredients": [
    { "id": "i1", "name": "ingredient name", "amount": 2, "unit": "oz" }
  ],
  "steps": [
    "Step one...",
    "Step two..."
  ],
  "mocktail": {
    "description": "How to make a non-alcoholic version. Only include if the result is genuinely good."
  }
}
```

### Field notes
- `id`: lowercase, hyphenated, unique across all cocktails
- `servings`: integer — use 1 for single-serve, higher for batch
- `difficulty`: `"easy"` for anything a non-bartender can make in 5 minutes; `"medium"` for batch prep, infusions, or multi-step builds
- `glassware`: descriptive string — e.g. `"Rocks glass"`, `"Highball glass"`, `"Coupe"`, `"Wine glass"`
- `ingredients[].unit`: use `"oz"` for liquid measurements, `"dashes"` for bitters, `"pinch"` for salt, `null` for whole items (a lime, a sprig)
- `mocktail`: omit the field entirely if no good non-alcoholic version exists — do not add a placeholder
- `steps`: second-person imperative, same style as food recipes

---

## Style & Tone

- **Descriptions** should be specific and appetizing — say what makes the drink distinct, not just what's in it.
- **Steps** should be practical and precise — temperatures, timing, and technique details matter in cocktails more than cooking.
- **Ingredient names** should specify brand or style where it meaningfully affects the result (e.g. `"blanco tequila (e.g. Espolòn, Olmeca Altos)"`).
