import type { Ingredient, PantryEntry, Recipe } from './types.ts';

export interface Suggestion { recipe: Recipe; have: Ingredient[]; low: Ingredient[]; missing: Ingredient[]; coverage: number }

// Words that describe size, freshness or preparation rather than which food it is.
const descriptors = new Set(['fresh', 'freshly', 'large', 'small', 'medium', 'extra', 'virgin', 'extra-virgin', 'low-sodium', 'reduced-sodium',
  'unsalted', 'salted', 'raw', 'whole', 'boneless', 'skinless', 'organic', 'ripe', 'chopped', 'minced', 'diced', 'sliced', 'grated', 'crumbled',
  'shredded', 'torn', 'toasted', 'roasted', 'jarred', 'canned', 'frozen', 'dried', 'ground', 'finely', 'thinly', 'roughly', 'coarsely', 'packed', 'plus', 'more',
  // Forms of a food, so "garlic" covers "garlic cloves" and "lime" covers "lime juice".
  'clove', 'cloves', 'head', 'bunch', 'sprig', 'sprigs', 'stalk', 'stalks', 'floret', 'florets', 'juice', 'zest', 'can', 'jar']);
// Assumed to be in every kitchen, so they never count as missing.
const staples = new Set(['salt', 'kosher salt', 'sea salt', 'flaky salt', 'black pepper', 'pepper', 'kosher salt black pepper', 'salt pepper', 'water', 'ice']);

const singular = (word: string) => word.replace(/oes$/, 'o').replace(/ies$/, 'y').replace(/([^s])s$/, '$1');
function words(name: string): string[] {
  return name.toLowerCase().replace(/\([^)]*\)/g, ' ').split(',')[0]
    .replace(/[^a-z\s-]/g, ' ').split(/\s+/).map(singular).filter(w => w && w !== 'and' && !descriptors.has(w));
}
// "soy sauce or tamari" is satisfied by either option.
const alternatives = (name: string) => name.split(/\bor\b/).map(words).filter(w => w.length);
// English puts the food last, so "onion" matches "yellow onion" but "rice" never matches "rice vinegar".
const endsWith = (large: string[], small: string[]) => small.length <= large.length && small.every((w, i) => w === large[large.length - small.length + i]);

export const isStaple = (name: string) => staples.has(words(name).join(' '));

export function pantryMatches(pantryName: string, ingredientName: string): boolean {
  const item = words(pantryName);
  return !!item.length && alternatives(ingredientName).some(option => endsWith(option, item) || endsWith(item, option));
}

export function suggestRecipes(recipes: Recipe[], pantry: PantryEntry[]): Suggestion[] {
  const stocked = pantry.filter(entry => entry.status !== 'out');
  return recipes.map(recipe => {
    const have: Ingredient[] = [], low: Ingredient[] = [], missing: Ingredient[] = [];
    for (const ingredient of recipe.ingredients) {
      if (isStaple(ingredient.name)) continue;
      const matches = stocked.filter(entry => pantryMatches(entry.name, ingredient.name));
      if (matches.some(entry => entry.status === 'have')) have.push(ingredient);
      else if (matches.length) low.push(ingredient);
      else missing.push(ingredient);
    }
    const total = have.length + low.length + missing.length;
    return { recipe, have, low, missing, coverage: total ? (have.length + low.length * 0.5) / total : 0 };
  }).filter(s => s.have.length + s.low.length > 0)
    .sort((a, b) => b.coverage - a.coverage || a.missing.length - b.missing.length || a.recipe.time - b.recipe.time);
}
