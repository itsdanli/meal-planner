import type { Recipe } from './types.ts';

export interface RecipePreferences { favorites: string[]; disliked: string[] }

// Reads a saved list of recipe IDs, ignoring anything that is not a string.
export function readIdList(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : [];
}

// Recipes that should still be suggested, randomized and planned from.
export function withoutDisliked(recipes: Recipe[], disliked: string[]): Recipe[] {
  if (!disliked.length) return recipes;
  const hidden = new Set(disliked);
  return recipes.filter(recipe => !hidden.has(recipe.id));
}

// Setting (not toggling) keeps this safe to call from an Undo button. A recipe the
// user did not like is no longer a favorite.
export function applyDislike(prefs: RecipePreferences, id: string, disliked: boolean): RecipePreferences {
  if (!disliked) return { favorites: prefs.favorites, disliked: prefs.disliked.filter(x => x !== id) };
  return {
    favorites: prefs.favorites.filter(x => x !== id),
    disliked: prefs.disliked.includes(id) ? prefs.disliked : [...prefs.disliked, id],
  };
}
