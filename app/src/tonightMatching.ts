import { calculateGroceries, canonicalIngredient } from './grocery.ts';
import { ingredientIdentity, ingredientParts, pantryMatches, pantryContributes } from './ingredients.ts';
import type { GroceryItem, PantryEntry, Recipe } from './types.ts';

export type Readiness = 'ready' | 'check' | 'almost' | 'more';
export type IngredientAvailability = 'available' | 'check' | 'missing';
export interface TonightIngredient extends GroceryItem { availability: IngredientAvailability; pantryEntries: PantryEntry[] }
export interface TonightResult {
  recipe: Recipe; servings: number; proteinIndex?: number; ingredients: TonightIngredient[];
  pantryMissing: string[]; readiness: Readiness; available: number; check: number; missing: number;
}
export const readinessLabels: Record<Readiness, string> = {
  ready: 'Ready to cook', check: 'Check quantities', almost: 'Missing 1–2 items', more: 'More ideas',
};
const order: Record<Readiness, number> = { ready: 0, check: 1, almost: 2, more: 3 };

/** Evaluate one candidate independently. Plan-wide confirmations cannot prove
 * coverage for a different recipe or serving count. Weekly stock is recomputed on add.
 */
export function assessTonight(recipe: Recipe, pantry: PantryEntry[], servings: number, proteinIndex?: number): TonightResult {
  if (!Number.isInteger(servings) || servings < 1 || servings > 24) throw new Error('Choose between 1 and 24 servings.');
  if (proteinIndex !== undefined && (!Number.isInteger(proteinIndex) || !recipe.proteins?.[proteinIndex])) throw new Error('Choose a valid protein.');
  const inventory = pantry.map(entry => ({ ...entry, confirmedEnough: false }));
  const ingredients = calculateGroceries([recipe], [{ id: 'tonight', recipeId: recipe.id, servings, proteinIndex }], inventory).map(item => {
    const pantryEntries = inventory.filter(entry => entry.status !== 'out' && entry.quantity !== 0
      && (canonicalIngredient(entry.name) === item.name || pantryContributes(entry.name, item.name)));
    const availability: IngredientAvailability = item.status === 'covered' ? 'available'
      : !pantryEntries.length || item.status === 'needed' ? 'missing' : 'check';
    return { ...item, availability, pantryEntries };
  });
  // Pantry discovery is presence-based. Keep quantity verification separate,
  // but respect a known shortage. Every component of a combined line is required.
  const missingNames = ingredients.flatMap(item => {
    const absent = ingredientParts(item.name).filter(part => !inventory.some(entry => entry.status !== 'out' && entry.quantity !== 0
      && (canonicalIngredient(entry.name) === canonicalIngredient(part) || pantryMatches(entry.name, part))));
    return absent.length ? absent : item.status === 'needed' && (item.shortage ?? 0) > 0 ? [item.name] : [];
  });
  const pantryMissing = [...new Map(missingNames.map(name => [ingredientIdentity(name), name])).values()];
  const available = ingredients.filter(item => item.availability === 'available').length;
  const missing = ingredients.filter(item => item.availability === 'missing').length;
  const check = ingredients.filter(item => item.availability === 'check').length;
  const readiness: Readiness = !ingredients.length ? 'check' : missing ? (missing <= 2 ? 'almost' : 'more') : check ? 'check' : 'ready';
  return { recipe, servings, proteinIndex, ingredients, pantryMissing, readiness, available, missing, check };
}

export function rankTonight(recipes: Recipe[], pantry: PantryEntry[], servings: number, proteins: Record<string, number | undefined> = {}): TonightResult[] {
  return recipes.map(recipe => assessTonight(recipe, pantry, servings, proteins[recipe.id])).sort((a, b) =>
    order[a.readiness] - order[b.readiness] || a.missing - b.missing || a.check - b.check
    || b.available - a.available || a.recipe.time - b.recipe.time || a.recipe.name.localeCompare(b.recipe.name));
}
