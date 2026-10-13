import rawRecipes from '../../recipes.json';
import { ingredientIdentity, isOptionalIngredient } from './ingredients';
import type { Recipe } from './types';
// Enrich the bundled library without changing original cooking instructions or old snapshots.
export const recipes: Recipe[] = (rawRecipes as unknown as Recipe[]).map(recipe => ({
  ...recipe, ingredients: recipe.ingredients.map(item => ({ ...item,
    ingredientId: ingredientIdentity(item.name), optional: isOptionalIngredient(item.name),
  })),
}));
