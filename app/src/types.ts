export interface Ingredient { id: string; name: string; amount: number | null; unit: string | null; category: string }
export interface Protein { name: string; amount: string; instructions?: string }
export interface Recipe { id: string; name: string; bucket: string; bucketLabel: string; time: number; servings: number; description: string; ingredients: Ingredient[]; steps: string[]; proteins?: Protein[]; source?: string }
export interface Meal { id: string; recipeId: string; servings: number; proteinIndex?: number; recipeSnapshot?: Recipe }
export type PantryStatus = 'have' | 'low' | 'out';
export interface PantryEntry { id: string; name: string; status: PantryStatus; quantity?: number; unit?: string; confirmedEnough?: boolean; updatedAt: string }
export interface PlannerState { weekOf: string; meals: Meal[]; pantry: PantryEntry[] }
export interface GroceryItem { id: string; name: string; category: string; unit: string; needed: number | null; covered: number; shortage: number | null; status: 'needed' | 'covered' | 'review'; reasons: string[]; meals: string[] }
