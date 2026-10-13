import type { Recipe } from './types.ts';

// Picks distinct recipes, avoiding the excluded ones unless too few others remain.
export function pickRandomRecipes(recipes: Recipe[], count: number, excludeIds: string[] = [], random: () => number = Math.random): Recipe[] {
  const shuffle = (list: Recipe[]) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const excluded = new Set(excludeIds);
  const fresh = shuffle(recipes.filter(recipe => !excluded.has(recipe.id)));
  const repeats = shuffle(recipes.filter(recipe => excluded.has(recipe.id)));
  return [...fresh, ...repeats].slice(0, count);
}
