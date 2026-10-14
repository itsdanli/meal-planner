import { ingredientIdentity, pantryMatches, searchIngredients } from './ingredients.ts';
import type { PantryEntry, Recipe } from './types.ts';

// Everyday items, named so they match the recipe library (see suggest.ts).
export const commonItems: { group: string; items: string[] }[] = [
  { group: 'Produce', items: ['garlic', 'onion', 'lemon', 'lime', 'lemon juice', 'lime juice', 'carrots', 'spinach', 'cilantro', 'parsley', 'basil', 'green onions', 'ginger', 'red bell pepper', 'green bell pepper', 'cherry tomatoes', 'avocado', 'broccoli', 'cucumber', 'russet potatoes', 'yukon gold potatoes', 'zucchini', 'cremini mushrooms'] },
  { group: 'Fridge & freezer', items: ['eggs', 'butter', 'milk', 'heavy cream', 'greek yogurt', 'parmesan', 'feta', 'cheddar', 'fresh mozzarella', 'silken tofu', 'chicken', 'chicken breast', 'frozen corn', 'frozen peas', 'frozen edamame'] },
  { group: 'Pantry', items: ['olive oil', 'neutral oil', 'sesame oil', 'soy sauce', 'rice vinegar', 'vegetable broth', 'jasmine rice', 'basmati rice', 'spaghetti', 'penne', 'diced tomatoes (14oz can)', 'tomato paste', 'canned black beans', 'canned chickpeas', 'full-fat coconut milk', 'peanut butter', 'corn tortillas', 'flour tortillas', 'bread', 'flour', 'sugar', 'brown sugar', 'honey'] },
  { group: 'Spices', items: ['kosher salt', 'black pepper', 'red pepper flakes', 'cumin', 'oregano', 'smoked paprika', 'chili powder', 'curry powder', 'cinnamon', 'sesame seeds'] },
];

/** Common items ordered by how many of the household's recipes use each, most useful first. */
export function rankedCommonItems(recipes: Recipe[]) {
  const uses = (item: string) => recipes.filter(r => r.ingredients.some(i => pantryMatches(item, i.name))).length;
  return commonItems.map(({ group, items }) => ({
    group,
    items: items.map((name, order) => ({ name, uses: uses(name), order })).sort((a, b) => b.uses - a.uses || a.order - b.order),
  }));
}

/** Keep sixteen fresh suggestions per group, replacing items as they enter the pantry. */
export function suggestedCommonItems(groups: ReturnType<typeof rankedCommonItems>, pantry: PantryEntry[], query = '') {
  const existing = new Set(pantry.map(item => ingredientIdentity(item.name)));
  const search = query.trim().toLowerCase();
  const matches = new Set(searchIngredients(query).map(item => item.id));
  return groups.map(({ group, items }) => ({
    group,
    items: items.filter(item => !existing.has(ingredientIdentity(item.name))
      && (!search || item.name.includes(search) || matches.has(ingredientIdentity(item.name)))).slice(0, 16),
  })).filter(group => group.items.length > 0);
}
