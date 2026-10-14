import { pantryMatches } from './ingredients.ts';
import type { Recipe } from './types.ts';

// Everyday items, named so they match the recipe library (see suggest.ts).
export const commonItems: { group: string; items: string[] }[] = [
  { group: 'Produce', items: ['garlic', 'onion', 'lemon', 'lime', 'lemon juice', 'lime juice', 'carrots', 'spinach', 'cilantro', 'parsley', 'basil', 'green onions', 'ginger', 'red bell pepper', 'green bell pepper', 'cherry tomatoes', 'avocado', 'broccoli', 'cucumber', 'russet potatoes', 'yukon gold potatoes', 'zucchini', 'cremini mushrooms', 'apple', 'banana', 'berries', 'kale', 'green cabbage', 'butter lettuce'] },
  { group: 'Fridge & freezer', items: ['eggs', 'butter', 'milk', 'heavy cream', 'greek yogurt', 'parmesan', 'feta', 'cheddar', 'fresh mozzarella', 'silken tofu', 'firm tofu', 'paneer', 'ricotta', 'cottage cheese', 'hummus', 'chicken', 'frozen peas', 'frozen corn', 'frozen mixed vegetables', 'frozen edamame'] },
  { group: 'Pantry', items: ['olive oil', 'neutral oil', 'sesame oil', 'soy sauce', 'rice vinegar', 'vegetable broth', 'jasmine rice', 'basmati rice', 'brown rice', 'spaghetti', 'penne', 'soba noodles', 'rolled oats', 'quinoa', 'couscous', 'diced tomatoes (14oz can)', 'crushed tomatoes', 'tomato paste', 'canned black beans', 'canned chickpeas', 'canned cannellini beans', 'canned butter beans', 'red lentils', 'brown lentils', 'full-fat coconut milk', 'peanut butter', 'corn tortillas', 'flour tortillas', 'pita bread', 'bread', 'flour', 'sugar', 'brown sugar', 'honey', 'maple syrup', 'chia seeds'] },
  { group: 'Spices', items: ['kosher salt', 'black pepper', 'red pepper flakes', 'cumin', 'oregano', 'smoked paprika', 'chili powder', 'curry powder', 'cinnamon', 'sesame seeds', 'garam masala', 'ground turmeric', 'ground coriander', 'dried thyme'] },
];

/** Common items ordered by how many of the household's recipes use each, most useful first. */
export function rankedCommonItems(recipes: Recipe[]) {
  const uses = (item: string) => recipes.filter(r => r.ingredients.some(i => pantryMatches(item, i.name))).length;
  return commonItems.map(({ group, items }) => ({
    group,
    items: items.map((name, order) => ({ name, uses: uses(name), order })).sort((a, b) => b.uses - a.uses || a.order - b.order),
  }));
}
