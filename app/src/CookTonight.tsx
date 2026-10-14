import { useMemo, useState } from 'react';
import { rankTonight, type TonightIngredient, type TonightResult } from './tonightMatching';
import { ingredientLabel, isOptionalIngredient } from './ingredients';
import type { PantryEntry, Recipe } from './types';

interface Props {
  recipes: Recipe[]; pantry: PantryEntry[]; servings: number; onServings: (servings: number) => void;
  onAdd: (recipe: Recipe, servings: number, proteinIndex?: number) => void; onPantry: () => void;
  compact?: boolean; onSeeAll?: () => void;
}
const quantity = (value: number | null, unit: string) => value === null ? 'Amount to confirm' : `${Number(value.toFixed(2))} ${unit || 'each'}`;
const groupLabels = { available: 'Available', check: 'Check quantities', missing: 'Missing or short' };

function IngredientRow({ item }: { item: TonightIngredient }) {
  return <li>
    <div><strong>{item.name}</strong><span>{item.needed === null ? 'Amount to confirm' : `Need ${quantity(item.needed, item.unit)}`}</span></div>
    <p>{item.availability === 'available' ? `${quantity(item.covered, item.unit)} covered by your pantry`
      : item.availability === 'missing' ? (item.shortage === null ? 'Add to your list; confirm the amount.' : `Short ${quantity(item.shortage, item.unit)}`)
      : item.reasons.join(' ')}</p>
    {item.availability !== 'available' && item.pantryEntries.length > 0 && <p className="pantry-evidence">Tagged: {item.pantryEntries.map(entry => `${entry.name} (${entry.quantity === undefined ? 'amount unknown' : quantity(entry.quantity, entry.unit ?? '')}${entry.status === 'low' ? ', running low' : ''})`).join('; ')}</p>}
    {item.availability === 'missing' && item.reasons.length > 0 && <p>{item.reasons.join(' ')}</p>}
  </li>;
}

function TonightCard({ result, onProtein, onAdd }: { result: TonightResult; onProtein: (index: number | undefined) => void; onAdd: Props['onAdd'] }) {
  const protein = result.proteinIndex;
  const current = result;
  const optional = result.recipe.ingredients.filter(item => item.optional ?? isOptionalIngredient(item.name));
  return <article className="tonight-card">
    <div className="tonight-card-heading"><span className={`suggestion-badge ${current.readiness}`}>{current.pantryMissing.length ? `Need ${current.pantryMissing.length} more` : current.readiness === 'ready' ? 'Ready to cook' : 'All ingredients on hand'}</span><small>{result.recipe.time} min · {result.servings} servings</small></div>
    <h3>{result.recipe.name}</h3>
    <p className="tonight-match-summary">{current.pantryMissing.length ? <>Just need: <strong>{current.pantryMissing.map(ingredientLabel).join(', ')}</strong></> : 'Your pantry has every required ingredient.'}</p>
    {current.check > 0 && <p className="fine-print">Check amounts{current.ingredients.some(item => item.pantryEntries.some(entry => entry.status === 'low')) ? ' and items running low' : ''} for {result.servings} servings.</p>}
    {!!result.recipe.proteins?.length && <label className="tonight-protein">Protein add-on <select value={protein ?? ''} onChange={e => onProtein(e.target.value === '' ? undefined : Number(e.target.value))}><option value="">None — base recipe</option>{result.recipe.proteins.map((item, index) => <option key={index} value={index}>{item.name}</option>)}</select></label>}
    <details className="tonight-details"><summary>View ingredients & instructions</summary>
      {!current.ingredients.length && <p>No required quantities are recorded. Review the recipe before cooking.</p>}
      {(['available', 'check', 'missing'] as const).map(group => {
        const items = current.ingredients.filter(item => item.availability === group);
        return items.length > 0 && <section key={group}><h4>{groupLabels[group]}</h4><ul>{items.map(item => <IngredientRow key={item.id} item={item} />)}</ul></section>;
      })}
      {optional.length > 0 && <p className="fine-print">Optional extras, excluded from readiness and required groceries: {optional.map(item => item.name).join(', ')}.</p>}
      <h4>Method</h4><p className="fine-print">Ingredient amounts above are scaled to {result.servings} servings. Any amounts mentioned in these original instructions refer to the base recipe ({result.recipe.servings} servings).</p>
      <ol>{result.recipe.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
      {protein !== undefined && result.recipe.proteins?.[protein] && <><p className="fine-print">Original protein amount: {result.recipe.proteins[protein].amount} for {result.recipe.servings} servings. Your portion multiplier is {Number((result.servings / result.recipe.servings).toFixed(2))}×.</p><p>{result.recipe.proteins[protein].instructions}</p></>}
    </details>
    <button className="button secondary compact" onClick={() => onAdd(result.recipe, result.servings, protein)}>Add to this week · {result.servings} servings</button>
  </article>;
}

export default function CookTonight({ recipes, pantry, servings, onServings, onAdd, onPantry, compact, onSeeAll }: Props) {
  const [search, setSearch] = useState('');
  const [proteins, setProteins] = useState<Record<string, number | undefined>>({});
  const results = useMemo(() => rankTonight(recipes, pantry, servings, proteins), [recipes, pantry, servings, proteins]);
  const matches = results.filter(result => result.ingredients.length > 0 && (compact || `${result.recipe.name} ${result.recipe.ingredients.map(item => item.name).join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())));
  const sections = [
    { id: 'ready', title: 'Ready with your pantry', description: 'All required ingredients are listed in your kitchen. Check amounts where noted.', items: matches.filter(result => result.pantryMissing.length === 0), empty: 'No complete matches yet. Add the ingredients you have to find recipes here.' },
    { id: 'almost', title: 'Just 1–2 ingredients away', description: 'A short shopping list gets you there.', items: matches.filter(result => result.pantryMissing.length > 0 && result.pantryMissing.length <= 2), empty: 'No recipes are this close yet. Update your pantry to find closer matches.' },
  ];
  const stocked = pantry.some(item => item.status !== 'out' && item.quantity !== 0);
  return <section className="cook-tonight" aria-labelledby="tonight-heading">
    <div className="section-heading"><h2 id="tonight-heading">Cook tonight</h2>{compact ? <button className="text-button" onClick={onSeeAll}>See all matches</button> : <button className="text-button" onClick={onPantry}>Update kitchen items</button>}</div>
    <p className="section-note">Start with what’s in your kitchen. Choose a meal you have the ingredients for, or pick up just one or two extras.</p>
    <div className="tonight-controls">
      <label>Servings <select aria-label="Cook tonight servings" value={servings} onChange={e => onServings(Number(e.target.value))}>{Array.from({ length: 24 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>)}</select></label>
      {!compact && <input className="search-input" aria-label="Search Cook tonight recipes" placeholder="Search your matches" value={search} onChange={e => setSearch(e.target.value)} />}
      {Object.values(proteins).some(index => index !== undefined) && <button className="text-button" onClick={() => setProteins({})}>Reset protein choices</button>}
    </div>
    {!stocked && <div className="suggest-empty"><p>Tag the ingredients you have to start seeing matches. You don’t need to enter amounts.</p><button className="button secondary compact" onClick={onPantry}>Add kitchen items</button></div>}
    <div className="tonight-sections" aria-live="polite">{sections.map(section => <section className={`tonight-match-section ${section.id}`} key={section.id} aria-labelledby={`tonight-${section.id}`}>
      <div className="section-heading"><h3 id={`tonight-${section.id}`}>{section.title} <span className="tonight-section-count">{section.items.length}</span></h3></div>
      <p className="section-note">{section.description}</p>
      {section.items.length ? <div className="tonight-grid">{(compact ? section.items.slice(0, 3) : section.items).map(result => <TonightCard key={result.recipe.id} result={result} onProtein={index => setProteins(previous => ({ ...previous, [result.recipe.id]: index }))} onAdd={onAdd} />)}</div>
        : <p className="tonight-empty">{search.trim() ? 'No matches for this search. Try another ingredient or recipe name.' : section.empty}</p>}
    </section>)}</div>
  </section>;
}
