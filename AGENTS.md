# Project instructions

## Images for new recipes

Whenever adding recipes in any meal section, include the image workflow in the same task:

1. Ensure every recipe source is included in `app/scripts/fetch-recipe-images.mjs`. The current sources are `recipes.json`, `daytime-recipes.json`, `cocktails.json`, `smoker-recipes.json`, and `smoothies.json`.
2. Search for a relevant, freely licensed image using the image script. Set a useful `query` or reviewed `commonsTitle` for each recipe ID in `recipe-images.json` when the recipe name does not find an appropriate photo. Run `npm --prefix app run images:fetch`; existing downloaded images are preserved.
3. Save the image in `app/public/recipe-images/` and preserve the source URL, author, license, and license URL in `recipe-images.json`. Do not use an image without a suitable license or invent attribution.
4. Visually inspect each new image and its recipe card. Confirm that it depicts the dish reasonably and that the crop works. Similar-dish photos must not be represented as photos of the exact recipe.
5. If a suitable image cannot be found or downloaded, explicitly list the affected recipes and the reason in the completion report. Do not silently leave missing images or claim the image workflow succeeded.

This is a development workflow, not an image fetch on page load. Do not introduce runtime image searches or automatic network downloads during production builds.
