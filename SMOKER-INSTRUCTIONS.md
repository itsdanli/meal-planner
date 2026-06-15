# Smoker / Traeger Recipe Instructions

This file is the source of truth for how new smoker and Traeger recipes are added to `smoker-recipes.json`. Reference it every time a smoker recipe is being added or suggested.

---

## How Smoker Recipes Get Added

**1. Sync from `recipe-links.md`** — Add a URL with `Category: smoker` and status `pending`. When asked to sync, Claude will read pending smoker URLs, extract the recipe, apply all rules here, write to `smoker-recipes.json`, and mark the row `imported`.

**2. On-demand** — "Add N new smoker recipes" → research and write recipes directly, following all rules here.

---

## Core Philosophy

Every smoker recipe should be worth the time investment. The bar is: genuinely great results, well-sourced, and achievable on a home Traeger or pellet smoker without specialized equipment. Prefer tested, community-validated recipes — not food-magazine novelty.

---

## Non-Negotiable Requirements

### Source & Quality
- Must come from a reputable source: Traeger's own recipe library, Meat Church BBQ, Amazing Ribs (AmazingRibs.com), Hey Grill Hey, Serious Eats, or a recognized pitmaster with wide community validation.
- The `source` field must always be filled in.

### Equipment
- Every recipe must be achievable on a standard pellet smoker (Traeger, Pit Boss, Weber Smokefire, etc.).
- No recipes requiring a stick burner, drum smoker, or offset-only techniques.

### Vegetarian Base — NOT Required
- Unlike weeknight recipes, smoker recipes do **not** need a vegetarian base.
- These are meat-forward recipes by design. Sides and vegetable dishes are welcome as their own bucket (`sides`), but there is no requirement that meat be optional or removable.

### No Protein Add-On Array
- Smoker recipes **do not** use the weeknight recipe `proteins` array. The recipe itself is the protein. Do not add a `proteins` field.

### Tips
- Every recipe must include a `tips` array with at least 2 practical tips: common mistakes to avoid, wood pairing notes, timing advice, or carry-over cooking guidance.

---

## Difficulty Levels

| Value | Meaning |
|-------|---------|
| `beginner` | Forgiving cook, minimal monitoring. Great for first-timers. |
| `intermediate` | Requires attention (wrapping, spritzing, or multi-stage process). |
| `advanced` | Long cook, tight temperature windows, or significant technique (e.g., brisket). |

---

## Buckets

| Bucket ID | Label | Examples |
|-----------|-------|---------|
| `beef` | Beef | Brisket, tri-tip, beef ribs, chuck roast |
| `pork` | Pork | Baby back ribs, pork shoulder, St. Louis ribs, pork tenderloin |
| `poultry` | Poultry | Whole chicken, turkey, spatchcock chicken, chicken wings |
| `seafood` | Seafood | Salmon, shrimp, lobster tail |
| `sides` | Sides & Veggies | Smoked mac & cheese, corn, jalapeño poppers, smoked vegetables |

---

## Smoker Recipe JSON Schema

```json
{
  "id": "kebab-case-id",
  "name": "Human-Readable Name",
  "bucket": "beef | pork | poultry | seafood | sides",
  "bucketLabel": "Beef | Pork | Poultry | Seafood | Sides & Veggies",
  "prepTime": 20,
  "smokeTime": 360,
  "smokeTemp": 225,
  "internalTemp": 203,
  "wood": "Oak or Hickory",
  "servings": 6,
  "leftovers": true,
  "difficulty": "beginner | intermediate | advanced",
  "description": "One to two sentences. What makes this recipe great and why it works on the Traeger.",
  "source": "source.com or descriptive label",
  "ingredients": [
    { "id": "i1", "name": "ingredient name", "amount": 2, "unit": "lbs" }
  ],
  "steps": [
    "Step one...",
    "Step two..."
  ],
  "tips": [
    "Practical tip one...",
    "Practical tip two..."
  ]
}
```

### Field Notes
- `id`: lowercase, hyphenated, unique across all smoker recipes
- `prepTime`: integer, minutes of active hands-on prep before the cook begins
- `smokeTime`: integer, total minutes on the smoker (may include passive time)
- `smokeTemp`: integer, primary smoke temperature in °F
- `internalTemp`: integer (target internal temperature in °F) or `null` if done by feel/visual cues (e.g., ribs, pull-back test)
- `wood`: string describing recommended pellet/wood type and alternatives
- `leftovers`: `true` if the recipe reheats or cold-serves well
- `difficulty`: `"beginner"`, `"intermediate"`, or `"advanced"`
- `ingredients[].unit`: use `null` for whole items (a rack, a whole chicken)
- `steps`: second-person imperative, same style as food recipes — include temperatures and timing cues in the steps themselves
- `tips`: array of at least 2 tips; focus on practical pitfalls, substitutions, and technique notes

---

## Style & Tone

- **Descriptions** should convey what makes the cook special — not just what's in it. Name the method, the result, or the flavor payoff.
- **Steps** should include temperatures, timing windows, and visual/tactile doneness cues — not just instructions. Smoker recipes live or die by this detail.
- **Tips** should be genuinely useful, not generic. "Don't open the lid too often" is too vague. "Spritzing with apple juice every 45 minutes after the first hour builds bark and keeps moisture up" is useful.
