# Recipe Links

This is the master list of recipes to import into the appropriate data file.

**How to use:**
- Add a URL to the table with status `pending` whenever you find a recipe you want to add.
- Set status to `skip` to hold a URL without importing it yet.
- Use the optional `Category` column to route the recipe to the correct section. If omitted, Claude defaults to the weeknight `recipes.json`.
- When you ask Claude to "sync recipes from my list," Claude will read this file, skip any `imported` or `skip` rows, fetch and extract all `pending` URLs, route each to the correct file based on Category, and update their status to `imported` once done.
- Claude will still run the tried-it check and apply all rules from the relevant instructions file (exclusions, schema, etc.) before writing.

**Status values:** `pending` · `imported` · `skip`

**Category values (optional):**

| Category | Routes to | Instructions file |
|----------|-----------|-------------------|
| *(blank)* | `recipes.json` | `RECIPES-INSTRUCTIONS.md` |
| `asian` | `recipes.json` (bucket: `as`) | `RECIPES-INSTRUCTIONS.md` |
| `med` | `recipes.json` (bucket: `med`) | `RECIPES-INSTRUCTIONS.md` |
| `mx` | `recipes.json` (bucket: `mx`) | `RECIPES-INSTRUCTIONS.md` |
| `it` | `recipes.json` (bucket: `it`) | `RECIPES-INSTRUCTIONS.md` |
| `am` | `recipes.json` (bucket: `am`) | `RECIPES-INSTRUCTIONS.md` |
| `smoker` | `smoker-recipes.json` | `SMOKER-INSTRUCTIONS.md` |
| `smoothie` | `smoothies.json` | `SMOOTHIES-INSTRUCTIONS.md` |
| `cocktail` | `cocktails.json` | `COCKTAILS-INSTRUCTIONS.md` |

---

| URL | Notes | Category | Status |
|-----|-------|----------|--------|
| https://cookieandkate.com/black-bean-sweet-potato-enchiladas/ | | mx | skip |
| https://feastingnotfasting.com/traeger-smoked-salmon-the-best/ | | smoker | imported |