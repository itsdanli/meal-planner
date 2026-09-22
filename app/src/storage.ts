import { recipes } from './data';
import type { PlannerState } from './types';

const KEY = 'weeknight.sample.v1';
export function createSamplePlanner(): PlannerState {
  const today = new Date();
  today.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekOf = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return {
    weekOf,
    meals: recipes.slice(0, 3).map((recipe, index) => ({ id: `sample-${index}`, recipeId: recipe.id, servings: recipe.servings })),
    pantry: [
      { id: 'sample-salt', name: 'kosher salt', status: 'have', confirmedEnough: true, updatedAt: new Date().toISOString() },
      { id: 'sample-seasoning', name: 'taco seasoning', status: 'low', updatedAt: new Date().toISOString() },
    ],
  };
}

export function isPlannerState(value: unknown): value is PlannerState {
  if (!value || typeof value !== 'object') return false;
  const state = value as PlannerState;
  return typeof state.weekOf === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(state.weekOf)
    && Array.isArray(state.meals) && state.meals.every(meal => meal && typeof meal.id === 'string'
      && recipes.some(recipe => recipe.id === meal.recipeId) && Number.isFinite(meal.servings) && meal.servings > 0
      && (meal.proteinIndex === undefined || Number.isInteger(meal.proteinIndex)))
    && Array.isArray(state.pantry) && state.pantry.every(item => item && typeof item.id === 'string'
      && typeof item.name === 'string' && ['have', 'low', 'out'].includes(item.status)
      && (item.quantity === undefined || (Number.isFinite(item.quantity) && item.quantity >= 0))
      && (item.unit === undefined || typeof item.unit === 'string')
      && (item.confirmedEnough === undefined || typeof item.confirmedEnough === 'boolean')
      && typeof item.updatedAt === 'string');
}

export function loadPlanner(): PlannerState {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (isPlannerState(saved)) return saved;
  } catch { /* An unavailable or invalid browser store must not prevent the demo from opening. */ }
  return createSamplePlanner();
}

export function savePlanner(state: PlannerState): void {
  if (!isPlannerState(state)) throw new Error('This plan contains invalid data and could not be saved.');
  localStorage.setItem(KEY, JSON.stringify(state));
}
