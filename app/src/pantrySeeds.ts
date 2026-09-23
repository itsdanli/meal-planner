import { pantryMatches } from './suggest.ts';
import type { Recipe } from './types.ts';

// Everyday items, named so they match the recipe library (see suggest.ts).
export const commonItems: { group: string; items: string[] }[] = [
  { group: 'Produce', items: ['garlic', 'onion', 'lemon', 'lime', 'carrots', 'spinach', 'cilantro', 'parsley', 'basil', 'green onions', 'ginger', 'bell pepper', 'cherry tomatoes', 'avocado', 'broccoli', 'cucumber', 'potatoes', 'zucchini', 'mushrooms'] },
  { group: 'Fridge & freezer', items: ['eggs', 'butter', 'milk', 'heavy cream', 'greek yogurt', 'parmesan', 'feta', 'cheddar', 'mozzarella', 'tofu', 'chicken', 'frozen peas', 'edamame'] },
  { group: 'Pantry', items: ['olive oil', 'neutral oil', 'sesame oil', 'soy sauce', 'rice vinegar', 'vegetable broth', 'rice', 'pasta', 'canned tomatoes', 'tomato paste', 'black beans', 'chickpeas', 'coconut milk', 'peanut butter', 'tortillas', 'bread', 'flour', 'sugar', 'brown sugar', 'honey'] },
  { group: 'Spices', items: ['red pepper flakes', 'cumin', 'oregano', 'smoked paprika', 'chili powder', 'curry powder', 'cinnamon', 'sesame seeds'] },
];

/** Common items ordered by how many of the household's recipes use each, most useful first. */
export function rankedCommonItems(recipes: Recipe[]) {
  const uses = (item: string) => recipes.filter(r => r.ingredients.some(i => pantryMatches(item, i.name))).length;
  return commonItems.map(({ group, items }) => ({
    group,
    items: items.map((name, order) => ({ name, uses: uses(name), order })).sort((a, b) => b.uses - a.uses || a.order - b.order),
  }));
}
