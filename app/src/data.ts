import rawRecipes from '../../recipes.json';
import type { Recipe } from './types';
export const recipes = rawRecipes as unknown as Recipe[];
