# Smoothie Instructions

This file is the source of truth for how new smoothies are added to `smoothies.json`. Reference it every time a smoothie is being added or suggested.

---

## How Smoothies Get Added

**1. Sync from `recipe-links.md`** — Add a URL with `Category: smoothie` and status `pending`. When asked to sync, Claude will read pending smoothie URLs, extract the recipe, apply all rules here, write to `smoothies.json`, and mark the row `imported`.

**2. On-demand** — "Add N new smoothies" → research and write recipes directly, following all rules here.

---

## Core Philosophy

Every smoothie should taste great and be worth making again. The bar is: genuinely delicious, well-balanced, and achievable in under 10 minutes with a home blender. No overly medicinal "health" smoothies — if it doesn't taste good, it doesn't belong here.

---

## Non-Negotiable Requirements

### Time
- **10 minutes or less** total prep and blend time. No exceptions.

### Source & Quality
- Must come from a real, reputable source: a well-known food blog, nutrition-forward site, or recipe with broad community validation.
- Acceptable sources: Minimalist Baker, Cookie & Kate, Well Plated, Love & Lemons, Half Baked Harvest, Pinch of Yum, or a well-reviewed smoothie recipe from a trusted nutrition publication.
- The `source` field must always be filled in.

### No Protein Add-On Array
- Smoothies do **not** use the weeknight recipe `proteins` array. Do not include it.

### Tags
- Include a `tags` array with 1–4 relevant tags. Valid tags:
  - Dietary: `vegan`, `dairy-free`, `gluten-free`, `nut-free`
  - Nutritional: `high-protein`, `antioxidant-rich`, `low-sugar`
  - Other: `kid-friendly`, `meal-replacement`

---

## Buckets

| Bucket ID | Label | Examples |
|-----------|-------|---------|
| `protein` | Protein | Greek yogurt-based, protein powder, cottage cheese blends |
| `green` | Green | Spinach, kale, cucumber, matcha — greens as a featured ingredient |
| `fruit` | Fruit | Berry blends, stone fruit, citrus-forward smoothies |
| `tropical` | Tropical | Mango, pineapple, coconut, papaya — tropical fruit forward |

---

## Smoothie JSON Schema

```json
{
  "id": "kebab-case-id",
  "name": "Human-Readable Name",
  "bucket": "protein | green | fruit | tropical",
  "bucketLabel": "Protein | Green | Fruit | Tropical",
  "time": 5,
  "servings": 1,
  "description": "One to two sentences. What makes this smoothie great and why it's worth making.",
  "source": "source.com or descriptive label",
  "tags": ["vegan", "dairy-free"],
  "ingredients": [
    { "id": "i1", "name": "ingredient name", "amount": 1, "unit": "cup" }
  ],
  "steps": [
    "Step one...",
    "Step two..."
  ]
}
```

### Field Notes
- `id`: lowercase, hyphenated, unique across all smoothies
- `time`: integer, total minutes including prep and blend time
- `servings`: integer — usually 1, use 2 for larger batches
- `tags`: array of strings from the valid tag list above
- `ingredients[].unit`: use `null` for whole items (a banana, a date); use `"cup"`, `"tbsp"`, `"scoop"` for measured amounts
- `steps`: second-person imperative — include blender order (liquids first), blend duration, and any texture tips
- No `leftovers` field — smoothies are always made fresh and served immediately

---

## Style & Tone

- **Descriptions** should be appetizing and specific. Name what makes the flavor combination work, not just what's in it.
- **Steps** should mention blender order (liquid + greens first is standard for green smoothies), blend time, and how to adjust consistency. These small details matter.
- **Ingredient names** should be specific where it affects the result (e.g., `"frozen banana"` vs `"fresh banana"`, `"unsweetened almond milk"` vs just `"almond milk"`).
