import { ingredientParts, isOptionalIngredient, pantryMatches, sameIngredient } from './ingredients.ts';
import type { Ingredient, PantryEntry, Recipe } from './types.ts';
export { pantryMatches } from './ingredients.ts';

export type SuggestionGroup = 'on-hand' | 'check' | 'almost' | 'ideas';
export interface Suggestion { recipe: Recipe; have: Ingredient[]; low: Ingredient[]; missing: Ingredient[]; optional: Ingredient[]; coverage: number; group: SuggestionGroup }
// Water and ice are not shopping requirements. All food staples must be tagged.
export const isStaple = (name: string) => sameIngredient(name, 'water') || sameIngredient(name, 'ice');
export const suggestionGroupLabel: Record<SuggestionGroup, string> = {
  'on-hand': 'Ingredients on hand', check: 'Check what remains', almost: 'Almost there', ideas: 'More ideas',
};
const isSeasoningOnly = (ingredient: Ingredient) => ['kosher salt', 'black pepper'].some(name => sameIngredient(name, ingredient.name));
const groupOrder: Record<SuggestionGroup, number> = { 'on-hand': 0, check: 1, almost: 2, ideas: 3 };

export function suggestRecipes(recipes: Recipe[], pantry: PantryEntry[]): Suggestion[] {
  const stocked = pantry.filter(entry => entry.status !== 'out' && entry.quantity !== 0);
  return recipes.map(recipe => {
    const have: Ingredient[] = [], low: Ingredient[] = [], missing: Ingredient[] = [], optional: Ingredient[] = [];
    for (const original of recipe.ingredients) {
      const parts = ingredientParts(original.name);
      for (const [index, name] of parts.entries()) {
        const ingredient = parts.length === 1 ? original : { ...original, id: `${original.id}:${index}`, name, amount: null };
        if (ingredient.optional ?? isOptionalIngredient(ingredient.name)) { optional.push(ingredient); continue; }
        if (isStaple(ingredient.name)) continue;
        const matches = stocked.filter(entry => pantryMatches(entry.name, ingredient.name));
        if (matches.some(entry => entry.status === 'have')) have.push(ingredient);
        else if (matches.length) low.push(ingredient);
        else missing.push(ingredient);
      }
    }
    const total = have.length + low.length + missing.length;
    const group: SuggestionGroup = !missing.length ? (low.length ? 'check' : 'on-hand') : missing.length <= 2 ? 'almost' : 'ideas';
    return { recipe, have, low, missing, optional, group, coverage: total ? (have.length + low.length * 0.5) / total : 0 };
  }).filter(s => [...s.have, ...s.low].some(ingredient => !isSeasoningOnly(ingredient)))
    .sort((a, b) => groupOrder[a.group] - groupOrder[b.group] || a.missing.length - b.missing.length
      || b.coverage - a.coverage || a.recipe.time - b.recipe.time);
}
