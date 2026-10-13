import rawCocktails from '../../cocktails.json';
import rawSmoker from '../../smoker-recipes.json';
import rawSmoothies from '../../smoothies.json';
import rawImages from '../../recipe-images.json';
import type { Recipe } from './types.ts';

export type LibraryKind = 'dinner' | 'cocktail' | 'smoker' | 'smoothie';
export interface LibraryEntry {
  kind: LibraryKind; id: string; name: string; label: string; description: string; facts: string[];
  ingredients: { id: string; name: string; amount: number | null; unit: string | null }[];
  steps: string[]; sections: { title: string; lines: string[] }[];
  recipe?: Recipe;
}
export interface RecipeImage { url: string; author: string; license: string; sourceUrl: string }

type Raw = Record<string, any>;
const present = (values: (string | false | null | undefined)[]) => values.filter((v): v is string => !!v);
const base = (kind: LibraryKind, r: Raw) => ({ kind, id: r.id as string, name: r.name as string, label: r.bucketLabel as string, description: (r.description ?? '') as string, ingredients: r.ingredients ?? [], steps: r.steps ?? [] });

export function dinnerEntry(recipe: Recipe): LibraryEntry {
  return { ...base('dinner', recipe), facts: [`${recipe.time} min`, `Serves ${recipe.servings}`], recipe,
    sections: recipe.proteins?.length ? [{ title: 'Protein add-ons', lines: recipe.proteins.map(p => `${p.name} (${p.amount})${p.instructions ? `: ${p.instructions}` : ''}`) }] : [] };
}
export const cocktails: LibraryEntry[] = (rawCocktails as Raw[]).map(r => ({ ...base('cocktail', r),
  facts: present([r.servings > 1 ? `Serves ${r.servings}` : 'Serves 1', r.glassware]),
  sections: r.mocktail?.description ? [{ title: 'Mocktail', lines: [r.mocktail.description] }] : [] }));
export const smokerRecipes: LibraryEntry[] = (rawSmoker as Raw[]).map(r => ({ ...base('smoker', r),
  facts: present([`Prep ${r.prepTime} min`, `Smoke ${r.smokeTime} min at ${r.smokeTemp}°F`, r.internalTemp && `Internal ${r.internalTemp}°F`, r.wood && `Wood: ${r.wood}`, `Serves ${r.servings}`]),
  sections: r.tips?.length ? [{ title: 'Tips', lines: r.tips }] : [] }));
export const smoothies: LibraryEntry[] = (rawSmoothies as Raw[]).map(r => ({ ...base('smoothie', r),
  facts: present([`${r.time} min`, `Serves ${r.servings}`, ...(r.tags ?? [])]), sections: [] }));

// Photos are similar dishes from Wikimedia Commons; see recipe-images.json for credits.
export function recipeImage(id: string): RecipeImage | undefined {
  const entry = (rawImages as Record<string, { file?: string; author?: string; license?: string; sourceUrl?: string }>)[id];
  if (!entry?.file) return undefined;
  return { url: `${import.meta.env?.BASE_URL ?? './'}recipe-images/${entry.file}`, author: entry.author ?? 'Unknown', license: entry.license ?? '', sourceUrl: entry.sourceUrl ?? '' };
}
