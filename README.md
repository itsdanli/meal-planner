# Weeknight Planner

A personal meal planning app hosted on GitHub Pages. Browse a library of real, tested recipes, plan your week, and export a precise grocery list — with scaling for leftovers.

---

## Features

- **This Week** — pick 3–4 meals, set a recipe scale (×1/×2/×3), and export a grocery list as text or download
- **Recipe Library** — browse all recipes with cuisine/filter search; click any card to see the full recipe with scaled ingredient amounts
- **Favorites** — starred recipes appear first when shuffling your weekly rotation
- **Add Recipe** — fill out a form to generate a correctly-formatted JSON snippet, then paste it into `recipes.json` via GitHub
- **Meat add-on selector** — choose your protein per meal; proteins are listed separately in the grocery list
- **Persistent favorites** — saved in the browser via `localStorage`

---

## One-Time Setup (GitHub Pages)

### 1. Create a GitHub repository

1. Go to [github.com](https://github.com) and sign in (or create a free account).
2. Click **New repository** (the green button, or the `+` icon → New repository).
3. Name it something like `meal-planner` or `weeknight-planner`.
4. Set it to **Public** (required for free GitHub Pages hosting).
5. Leave all other options as defaults. Click **Create repository**.

### 2. Upload the files

You need to upload these four files to the root of your repo:

```
index.html
recipes.json
prefs.json
current-week.json
```

**Option A — drag and drop (easiest):**
1. On your new repo page, click **Add file → Upload files**.
2. Drag all four files into the upload area.
3. Click **Commit changes**.

**Option B — GitHub Desktop or git CLI** (if you prefer):
```bash
git clone https://github.com/YOUR_USERNAME/meal-planner.git
# Copy the 4 files into the folder
git add .
git commit -m "Initial upload"
git push
```

### 3. Enable GitHub Pages

1. In your repo, go to **Settings** (tab at the top).
2. Scroll down to **Pages** in the left sidebar.
3. Under **Source**, select **Deploy from a branch**.
4. Set **Branch** to `main` and folder to `/ (root)`.
5. Click **Save**.

GitHub will show you a URL like `https://YOUR_USERNAME.github.io/meal-planner/`. It takes about 30–60 seconds to go live.

### 4. Open the app

Visit your GitHub Pages URL. Bookmark it on your phone and desktop.

---

## Adding New Recipes

The app includes an **Add Recipe** form (button in the top-right of the Recipe Library view). Here's the full workflow:

1. Fill out the form with the recipe name, cuisine, cook time, servings, ingredients (with amounts and units), steps, and your protein add-on options.
2. Click **Generate JSON snippet**.
3. Click **Copy JSON** to copy the snippet to your clipboard.
4. Go to your GitHub repo → open `recipes.json` → click the **pencil icon (✎)** to edit.
5. Scroll to the **end of the file**. Before the final `]`, add a **comma** after the last recipe's closing `}`, then paste your snippet.
6. Click **Commit changes** (green button).
7. Wait ~30 seconds, then reload the app — your new recipe appears in the library.

**Tip:** On mobile, this is easiest from the GitHub mobile app or github.com in your browser.

---

## Managing Favorites

- Tap the **♥** on any recipe card to favorite it.
- Favorites are saved in your browser (`localStorage`) automatically — no GitHub action needed.
- Favorites appear first when you shuffle your weekly rotation.
- The **Favorites** view shows all your starred recipes.

> **Note:** Because favorites use `localStorage`, they are browser-specific. If you switch browsers or devices, you'll need to re-favorite your recipes. A future version can sync this to `prefs.json` via the GitHub API.

---

## Editing an Existing Recipe

Recipes live in `recipes.json` in your GitHub repo. To edit one:

1. Go to your repo on GitHub.
2. Click `recipes.json` → click the **pencil icon (✎)**.
3. Find the recipe you want to change (use Ctrl+F / Cmd+F to search by name).
4. Edit the relevant fields (name, ingredients, steps, etc.).
5. Click **Commit changes**.

The JSON structure for each ingredient:
```json
{
  "id": "i1",
  "name": "black beans (15oz can)",
  "amount": 2,
  "unit": "cans",
  "category": "pantry"
}
```

Categories: `produce`, `pantry`, `dairy`, `grains`

---

## File Reference

| File | Purpose |
|------|---------|
| `index.html` | The entire app — HTML, CSS, and JavaScript |
| `recipes.json` | All recipes. Edit this to add/change recipes. |
| `prefs.json` | Stores favorites and protein preferences (future GitHub API sync) |
| `current-week.json` | Stores the current weekly plan (future Cowork automation target) |

---

## Cowork Automation (Future)

The file structure is designed to support a local Cowork/Python automation that:
1. Reads `recipes.json` and your favorites from `prefs.json`
2. Picks next week's rotation (weighted toward favorites)
3. Writes `current-week.json`
4. Pushes to GitHub via `git` or the GitHub API

When this is set up, the app will automatically show a fresh weekly rotation every time you open it — without any manual action. See the Cowork setup guide (coming separately).

---

## Troubleshooting

**The app shows a blank page:**
Make sure all four files (`index.html`, `recipes.json`, `prefs.json`, `current-week.json`) are in the root of your repo — not inside a subfolder.

**Recipes aren't loading:**
Open browser DevTools (F12) → Console tab and look for fetch errors. If you see a CORS error, make sure GitHub Pages is enabled and you're accessing via the `github.io` URL (not a local `file://` path, which won't work with `fetch()`).

**To test locally before uploading:**
You can't open `index.html` directly as a file because `fetch()` is blocked locally. Instead, run a simple local server:
```bash
cd meal-planner
python3 -m http.server 8000
# Then open http://localhost:8000 in your browser
```
