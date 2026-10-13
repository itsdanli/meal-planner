import { forwardRef } from 'react';
import { flushSync } from 'react-dom';
import type { Meal, Recipe } from './types';

const amount = (n: number | null) => n === null ? '' : Number(n.toFixed(2)).toString();
const SMALLEST = 6.5;
const READABLE = 7.5;

// Shrinks the text until every page's recipes fit; returns the size used, or 0 if they cannot fit.
export function fitRecipeSheet(sheet: HTMLElement): number {
  sheet.classList.add('measuring');
  sheet.classList.remove('spill');
  const pages = [...sheet.children];
  // scrollHeight never reports less than the box itself, so measure where the content actually ends.
  const fits = () => pages.every(page => Math.max(...[...page.children].map(child => child.getBoundingClientRect().bottom)) - page.getBoundingClientRect().top <= page.clientHeight - 8);
  let size = 12;
  for (; size >= SMALLEST; size -= 0.25) {
    sheet.style.fontSize = `${size}pt`;
    if (fits()) break;
  }
  if (size < SMALLEST) sheet.classList.add('spill');
  sheet.classList.remove('measuring');
  return size < SMALLEST ? 0 : size;
}

// Prints on one landscape side when the text stays readable, otherwise on the front and back of one sheet.
export function printRecipeSheet(sheet: HTMLElement, setSides: (sides: 1 | 2) => void, mealCount: number): void {
  flushSync(() => setSides(1));
  if (fitRecipeSheet(sheet) < READABLE && mealCount > 1) {
    flushSync(() => setSides(2));
    fitRecipeSheet(sheet);
  }
  const page = document.createElement('style');
  page.textContent = '@media print { @page { size: landscape; margin: .4in; } }';
  document.head.appendChild(page);
  document.body.classList.add('printing-recipes');
  window.addEventListener('afterprint', () => { page.remove(); document.body.classList.remove('printing-recipes'); }, { once: true });
  window.print();
}

interface Props { weekLabel: string; meals: { meal: Meal; recipe: Recipe }[]; sides: 1 | 2 }
const RecipeSheet = forwardRef<HTMLDivElement, Props>(({ weekLabel, meals, sides }, ref) => {
  const front = sides === 2 ? Math.ceil(meals.length / 2) : meals.length;
  const groups = [meals.slice(0, front), meals.slice(front)].filter(group => group.length);
  return <div className="recipe-sheet" ref={ref}>{groups.map((group, index) => <div className="sheet-page" key={index} style={{ gridTemplateColumns: `repeat(${group.length}, minmax(0, 1fr))` }}>
    <header style={{ gridColumn: '1 / -1' }}><strong>wmp</strong> · Week of {weekLabel} · {meals.length} {meals.length === 1 ? 'dinner' : 'dinners'}{groups.length > 1 ? ` · ${index === 0 ? 'front' : 'back'}` : ''}</header>
    {group.map(({ meal, recipe }) => {
      const scale = meal.servings / recipe.servings;
      const protein = meal.proteinIndex === undefined ? undefined : recipe.proteins?.[meal.proteinIndex];
      return <section key={meal.id}>
        <h2>{recipe.name}</h2>
        <p className="sheet-meta">{meal.servings} servings · {recipe.time} min{protein ? ` · with ${protein.name}` : ''}</p>
        <h3>Ingredients</h3>
        <ul>{recipe.ingredients.map(i => <li key={i.id}>{amount(i.amount === null ? null : i.amount * scale)} {i.unit} {i.name}</li>)}
          {protein && <li><strong>{protein.name}: {protein.amount}{scale !== 1 ? ` × ${amount(scale)}` : ''}</strong></li>}</ul>
        <h3>Method</h3>
        <ol>{recipe.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
        {protein?.instructions && <p className="sheet-protein"><strong>{protein.name}:</strong> {protein.instructions}</p>}
      </section>;
    })}
  </div>)}</div>;
});
export default RecipeSheet;
