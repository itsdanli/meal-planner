import { pantryContributes, sameIngredient, ingredientOptions, isOptionalIngredient } from './ingredients.ts';
import type { GroceryItem, Ingredient, Meal, PantryEntry, Recipe } from './types.ts';

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
// Only reviewed aliases: never erase arbitrary parenthetical text, sizes or food forms.
const aliases: Record<string, string> = {};
const aliasGroups = [
  ['yellow onion', 'yellow onion, diced', 'yellow onion, finely diced', 'yellow onion, sliced'],
  ['large yellow onion', 'large yellow onion, diced', 'large yellow onion, finely diced', 'large yellow onion, sliced', 'large yellow onion, diced (about 1½ cups)'],
  ['garlic cloves', 'garlic clove, minced', 'garlic cloves, minced', 'garlic cloves, sliced', 'garlic cloves, thinly sliced', 'garlic cloves, coarsely chopped'],
  ['cherry tomatoes', 'cherry tomatoes, halved'],
  ['fresh ginger', 'fresh ginger, grated', 'fresh ginger, finely grated'],
  ['fresh basil', 'fresh basil, torn'],
  ['fresh cilantro', 'fresh cilantro, for serving'],
  ['red bell pepper', 'red bell pepper, diced', 'red bell pepper, sliced', 'red bell pepper, thinly sliced'],
  ['english cucumber', 'english cucumber, diced', 'english cucumber, thinly sliced', 'english cucumber, julienned or thinly sliced'],
  ['black beans (15oz can)', 'black beans (15oz can), drained and rinsed', 'black beans (15oz can, liquid reserved)'],
  ['chickpeas (15oz can)', 'chickpeas (15oz can), drained and rinsed'],
  ['frozen peas', 'frozen peas, thawed'],
];
for (const [canonical, ...variants] of aliasGroups) {
  for (const name of [canonical, ...variants]) aliases[name] = canonical;
}
export function canonicalIngredient(name: string): string {
  const key = normalize(name);
  return aliases[key] ?? key;
}

function hasIngredientChoice(name: string): boolean {
  // These conjunctions describe preparation of one ingredient, not a second food.
  // Keep the full name for matching; only omit them from ambiguity detection.
  const preparations = /\b(drained|rinsed|seeded|diced|trimmed|cut|sliced|peeled|cubed|pitted|halved|zested|juiced|removed|chopped)\s+and\s+(?=(?:(?:finely|thinly|roughly|coarsely)\s+)?(?:drained|rinsed|seeded|diced|trimmed|cut|sliced|peeled|cubed|pitted|halved|zested|juiced|removed|chopped)\b)/g;
  return /\bor\b|\band\b|\+/.test(name.replace(preparations, '$1 '));
}

type Unit = { name: string; dimension: string; factor: number };
const units: Record<string, Unit> = {};
function register(name: string, dimension: string, factor: number, variants: string[]) {
  for (const variant of [name, ...variants]) units[variant] = { name, dimension, factor };
}
register('g', 'mass', 1, ['gram', 'grams']);
register('kg', 'mass', 1000, ['kilogram', 'kilograms']);
register('oz', 'mass', 28.349523125, ['ounce', 'ounces']);
register('lb', 'mass', 453.59237, ['lbs', 'pound', 'pounds']);
// US customary culinary volume; no volume-to-mass conversion is inferred.
register('ml', 'volume', 1, ['milliliter', 'milliliters']);
register('l', 'volume', 1000, ['liter', 'liters']);
register('tsp', 'volume', 4.92892159375, ['teaspoon', 'teaspoons']);
register('tbsp', 'volume', 14.78676478125, ['tablespoon', 'tablespoons']);
register('cup', 'volume', 236.5882365, ['cups']);
register('fl oz', 'volume', 29.5735295625, ['fluid ounce', 'fluid ounces']);
register('', 'count', 1, ['each']);
for (const name of ['can', 'packet', 'bag', 'block', 'bunch', 'piece', 'sheet', 'tub', 'clove', 'chop', 'link', 'fillet']) {
  register(name, `package:${name}`, 1, [`${name}s`]);
}
function unitOf(value: string | null | undefined): Unit {
  const name = normalize(value ?? '');
  return units[name] ?? { name, dimension: `unknown:${name}`, factor: 1 };
}
const validAmount = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const rounded = (value: number) => Math.round(value * 1e8) / 1e8;

function proteinIngredient(name: string, amount: string): Ingredient {
  // Full-string match deliberately rejects ranges, package annotations, and prose.
  const match = amount.trim().match(/^(\d+(?:\.\d+)?|\d+\/\d+|\d+ \d+\/\d+)\s*([a-zA-Z ]*)$/);
  let quantity: number | null = null;
  if (match) {
    quantity = match[1].split(' ').reduce((sum, part) => {
      const [n, d] = part.split('/').map(Number);
      return sum + (d === undefined ? n : n / d);
    }, 0);
  }
  return { id: `protein:${name}`, name, amount: validAmount(quantity) ? quantity : null, unit: match?.[2]?.trim() || null, category: 'Protein' };
}

export function calculateGroceries(recipes: Recipe[], meals: Meal[], pantry: PantryEntry[]): GroceryItem[] {
  const groups = new Map<string, { item: GroceryItem; unit: Unit; canonical: string }>();
  const recipesById = new Map(recipes.map(recipe => [recipe.id, recipe]));
  for (const meal of meals) {
    const recipe = meal.recipeSnapshot ?? recipesById.get(meal.recipeId);
    if (!recipe) continue;
    const scale = meal.servings / recipe.servings;
    const validScale = Number.isFinite(scale) && scale > 0;
    const ingredients = [...recipe.ingredients];
    const protein = meal.proteinIndex === undefined ? undefined : recipe.proteins?.[meal.proteinIndex];
    if (protein) ingredients.push(proteinIngredient(protein.name, protein.amount));
    for (const ingredient of ingredients) {
      if ((ingredient.optional ?? isOptionalIngredient(ingredient.name)) || sameIngredient(ingredient.name, 'water') || sameIngredient(ingredient.name, 'ice')) continue;
      const canonical = canonicalIngredient(ingredient.name);
      const unit = unitOf(ingredient.unit);
      const key = `${canonical}|${unit.dimension}`;
      let group = groups.get(key);
      if (!group) {
        group = { canonical, unit, item: { id: key, name: canonical, category: ingredient.category, unit: unit.name, needed: 0, covered: 0, shortage: 0, status: 'needed', reasons: [], meals: [] } };
        groups.set(key, group);
      }
      const { item } = group;
      if (!item.meals.includes(recipe.name)) item.meals.push(recipe.name);
      if (!validAmount(ingredient.amount) || !validScale) {
        item.needed = null;
        item.reasons.push(!validScale ? 'Check the meal serving count.' : 'Confirm the required amount.');
      } else if (item.needed !== null) {
        item.needed += ingredient.amount * scale * unit.factor / group.unit.factor;
      }
      if (unit.dimension.startsWith('unknown:')) item.reasons.push('Confirm this unit before shopping.');
      if (hasIngredientChoice(canonical)) item.reasons.push('Review the ingredient choice or combination.');
    }
  }
  // A pantry amount is a budget across the whole plan, not a fresh allowance per alias.
  const remaining = new Map(pantry.map(entry => [entry.id, validAmount(entry.quantity) ? entry.quantity * unitOf(entry.unit).factor : 0]));
  for (const group of groups.values()) {
    const { item, canonical, unit } = group;
    const siblings = [...groups.values()].filter(other => other.canonical === canonical);
    if (siblings.length > 1) item.reasons.push('Different units need review; no density or package size was assumed.');
    for (const entry of pantry.filter(entry => (canonicalIngredient(entry.name) === canonical || pantryContributes(entry.name, canonical)) && entry.status !== 'out')) {
      if (entry.status === 'low') item.reasons.push('Pantry is running low; check what remains.');
      if (validAmount(entry.quantity)) {
        const pantryUnit = unitOf(entry.unit);
        const exactAmountForm = canonicalIngredient(entry.name) === canonical;
        const liquid = ['olive oil', 'neutral oil', 'soy sauce', 'vegetable broth', 'sesame oil', 'milk'].some(name => sameIngredient(name, entry.name));
        const compatibleForm = exactAmountForm || unit.dimension === 'mass' || (unit.dimension === 'volume' && liquid);
        // Alternatives require a choice before consuming shared stock.
        if (pantryUnit.dimension === unit.dimension && !unit.dimension.startsWith('unknown:') && compatibleForm && !hasIngredientChoice(canonical) && ingredientOptions(canonical).length === 1 && item.needed !== null) {
          const available = remaining.get(entry.id) ?? 0;
          const used = Math.min(available, Math.max(0, item.needed - item.covered) * unit.factor);
          item.covered += used / unit.factor;
          remaining.set(entry.id, available - used);
        } else item.reasons.push('Check the amount, food form or package size before buying.');
      } else if (entry.status === 'have' && entry.confirmedEnough && canonicalIngredient(entry.name) === canonical && siblings.length === 1 && item.needed !== null) {
        item.covered = Math.max(item.covered, item.needed);
      } else item.reasons.push('Confirm whether the pantry has enough.');
    }
    item.needed = item.needed === null ? null : rounded(item.needed);
    item.covered = rounded(item.needed === null ? item.covered : Math.min(item.covered, item.needed));
    item.shortage = item.needed === null ? null : rounded(Math.max(0, item.needed - item.covered));
    item.reasons = [...new Set(item.reasons)];
    item.status = item.reasons.length || item.shortage === null ? 'review' : item.shortage === 0 ? 'covered' : 'needed';
    // An explicit "have enough" confirmation settles the item, whatever else was open for review.
    if (pantry.some(entry => canonicalIngredient(entry.name) === canonical && entry.status === 'have' && entry.confirmedEnough && !validAmount(entry.quantity))) {
      item.covered = item.needed ?? 0;
      item.shortage = 0;
      item.reasons = [];
      item.status = 'covered';
    }
  }
  return [...groups.values()].map(group => group.item).sort((a, b) => a.name.localeCompare(b.name) || a.unit.localeCompare(b.unit));
}
