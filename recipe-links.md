# Recipe Links

This is the master list of recipes to import into `recipes.json`.

**How to use:**
- Add a URL to the table with status `pending` whenever you find a recipe you want to add.
- Set status to `skip` to hold a URL without importing it yet.
- When you ask Claude to "sync recipes from my list," Claude will read this file, skip any `imported` or `skip` rows, fetch and extract all `pending` URLs, and update their status to `imported` once done.
- Claude will still run the tried-it check and apply all rules from `RECIPES-INSTRUCTIONS.md` (exclusions, vegetarian base, protein add-ons, etc.) before writing to `recipes.json`.

**Status values:** `pending` · `imported` · `skip`

---

| URL | Notes | Status |
|-----|-------|--------|
| https://cookieandkate.com/black-bean-sweet-potato-enchiladas/ | | pending |
