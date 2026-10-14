import { useEffect, useMemo, useRef, useState } from 'react';
import { recipes as libraryRecipes } from './data';
import { calculateGroceries, canonicalIngredient } from './grocery';
import { createSamplePlanner, loadPlanner, savePlanner } from './storage';
import type { GroceryItem, Meal, MealType, PantryEntry, PlannerState, Recipe } from './types';
import './styles.css';
import { suggestRecipes, suggestionGroupLabel, type Suggestion, type SuggestionGroup } from './suggest';
import { ingredientIdentity, ingredientLabel, sameIngredient, searchIngredients } from './ingredients';
import { rankedCommonItems, suggestedCommonItems } from './pantrySeeds';
import { pickRandomRecipes } from './randomMeals';
import CookTonight from './CookTonight';
import RecipeSheet, { printRecipeSheet } from './RecipeSheet';
import RecipeBrowser, { Heart } from './RecipeBrowser';
import { mealEntry, recipeImage, type LibraryEntry } from './library';
import { buildShoppingList, formatShoppingList } from './shoppingList';

type View = 'tonight' | 'week' | 'recipes' | 'pantry' | 'groceries';
const amount = (n: number | null) => n === null ? 'As needed' : Number(n.toFixed(2)).toString();
const STORE_BRAND_KEY = 'wmp.preferStoreBrand';
const uid = () => crypto.randomUUID();
const matchLabel = (s: Suggestion) => `${s.have.length} on hand${s.low.length ? ` · ${s.low.length} running low` : ''}`;
const missingLabel = (s: Suggestion) => {
  const missing = s.missing.length ? `Missing ${s.missing.slice(0, 4).map(i => ingredientLabel(i.name)).join(', ')}${s.missing.length > 4 ? ` +${s.missing.length - 4} more` : ''}.` : 'Required ingredients are tagged.';
  return `${missing} Check amounts for ${s.recipe.servings} servings.${s.optional.length ? ` ${s.optional.length} optional ${s.optional.length === 1 ? 'extra' : 'extras'} excluded.` : ''}`;
};
interface PlannerProps {
  initialState?: PlannerState;
  account?: string;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onSave?: (state: PlannerState) => void;
  onWeekChange?: (date: string) => void;
  saving?: boolean;
  cloudMessage?: string;
  cloudError?: boolean;
  onReload?: () => void;
  preferStoreBrand?: boolean;
  onPreferStoreBrand?: (value: boolean) => void;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
}
export default function App(props: PlannerProps) {
  const [state, setState] = useState<PlannerState>(() => props.initialState ?? loadPlanner());
  const cloud = !!props.account;
  const dirty = cloud && JSON.stringify(state) !== JSON.stringify(props.initialState);
  const recipes = libraryRecipes;
  const leaveEdits = () => !dirty || window.confirm('You have unsaved changes. Discard them?');
  useEffect(() => {
    if (!dirty) return;
    const preventLoss = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [dirty]);
  const [view, setView] = useState<View>('week');
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [tonightServings, setTonightServings] = useState(2);
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [quickAdd, setQuickAdd] = useState(() => (props.initialState ?? loadPlanner()).pantry.length < 8);
  const [addingCommon, setAddingCommon] = useState<Set<string>>(() => new Set());
  const commonTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => () => { commonTimers.current.forEach(clearTimeout); }, []);
  const [pickerMode, setPickerMode] = useState<'pantry' | 'all'>('pantry');
  const [suggestionFilter, setSuggestionFilter] = useState<SuggestionGroup | 'all'>('all');
  const [newItem, setNewItem] = useState('');
  const [detail, setDetail] = useState<LibraryEntry | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localStoreBrand, setLocalStoreBrand] = useState(() => { try { return localStorage.getItem(STORE_BRAND_KEY) === 'true'; } catch { return false; } });
  const storeBrand = props.preferStoreBrand ?? localStoreBrand;
  const setStoreBrand = (value: boolean) => { if (props.onPreferStoreBrand) return props.onPreferStoreBrand(value); setLocalStoreBrand(value); try { localStorage.setItem(STORE_BRAND_KEY, String(value)); } catch { /* The preference still applies for this visit. */ } };
  const jsonRef = useRef<HTMLTextAreaElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetSides, setSheetSides] = useState<1 | 2>(1);
  useEffect(() => { if (cloud) return; try { savePlanner(state); setSaveError(false); } catch { setSaveError(true); } }, [state, cloud]);
  const modalOpen = picker || !!detail || resetConfirm;
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusables = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button, input, select, a[href], [tabindex="0"]') ?? []).filter(el => !el.hasAttribute('disabled'));
    const initialFocus = dialog?.querySelector<HTMLElement>('input') ?? focusables()[0];
    initialFocus?.focus({ preventScroll: true });
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setPicker(false); setDetail(null); setResetConfirm(false); }
      if (event.key !== 'Tab') return;
      const elements = focusables();
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const shell = document.querySelector<HTMLElement>('.app-shell');
    if (shell) shell.inert = true;
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = previousOverflow; if (shell) shell.inert = false; previous?.focus(); };
  }, [modalOpen]);
  const groceries = useMemo(() => calculateGroceries(recipes, state.meals, state.pantry), [state]);
  const needed = groceries.filter(i => i.status === 'needed');
  const review = groceries.filter(i => i.status === 'review');
  const covered = groceries.filter(i => i.status === 'covered');
  const selected = state.meals.map(meal => ({ meal, recipe: meal.recipeSnapshot ?? recipes.find(r => r.id === meal.recipeId) })).filter((x): x is { meal: Meal; recipe: Recipe } => !!x.recipe);
  const suggestions = useMemo(() => suggestRecipes(recipes.filter(r => (r.mealType ?? 'dinner') === mealType), state.pantry).filter(s => !state.meals.some(m => m.recipeId === s.recipe.id)), [recipes, state.pantry, state.meals, mealType]);
  const mealTypes = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner']] as const;
  const dinnerRecipes = recipes.filter(r => (r.mealType ?? 'dinner') === 'dinner');
  const commonGroups = useMemo(() => rankedCommonItems(recipes), [recipes]);
  const commonSuggestions = suggestedCommonItems(commonGroups, state.pantry.filter(item => !addingCommon.has(ingredientIdentity(item.name))), newItem);
  const ingredientSearch = searchIngredients(newItem);
  const addCommon = (name: string) => {
    const identity = ingredientIdentity(name);
    if (commonTimers.current.has(identity)) return;
    addPantry(name);
    setAddingCommon(current => new Set(current).add(identity));
    commonTimers.current.set(identity, setTimeout(() => {
      setAddingCommon(current => { const next = new Set(current); next.delete(identity); return next; });
      commonTimers.current.delete(identity);
    }, 1240));
  };
  const addRecipe = (r: Recipe, servings = r.servings, proteinIndex?: number) => { setState(s => ({ ...s, pantry: clearConfirmation(s.pantry), meals: [...s.meals, { id: uid(), recipeId: r.id, servings, proteinIndex, recipeSnapshot: structuredClone(r) }] })); setPicker(false); setSearch(''); setMealType(r.mealType ?? 'dinner'); setView('week'); };
  const randomizeMeals = () => setState(s => ({ ...s, pantry: clearConfirmation(s.pantry), meals: [...s.meals.filter(m => ((m.recipeSnapshot ?? recipes.find(r => r.id === m.recipeId))?.mealType ?? 'dinner') !== mealType), ...pickRandomRecipes(recipes.filter(r => (r.mealType ?? 'dinner') === mealType), 3, s.meals.map(m => m.recipeId)).map(r => ({ id: uid(), recipeId: r.id, servings: r.servings, recipeSnapshot: structuredClone(r) }))] }));
  const planFromFavorites = (list: Recipe[]) => { setState(s => ({ ...s, pantry: clearConfirmation(s.pantry), meals: pickRandomRecipes(list, 3, s.meals.map(m => m.recipeId)).map(r => ({ id: uid(), recipeId: r.id, servings: r.servings, recipeSnapshot: structuredClone(r) })) })); setView('week'); };
  const openPicker = (mode: 'pantry' | 'all') => { setPickerMode(suggestions.length ? mode : 'all'); setSuggestionFilter('all'); setPicker(true); };
  const clearConfirmation = (pantry: PantryEntry[]) => pantry.map(p => ({ ...p, confirmedEnough: false }));
  const updateMeal = (id: string, changes: Partial<Meal>) => setState(s => ({ ...s, pantry: clearConfirmation(s.pantry), meals: s.meals.map(m => m.id === id ? { ...m, ...changes } : m) }));
  const updatePantry = (id: string, changes: Partial<PantryEntry>) => setState(s => ({ ...s, pantry: s.pantry.map(p => p.id === id ? { ...p, ...changes, updatedAt: new Date().toISOString() } : p) }));
  const addPantry = (name: string) => {
    if (!name.trim()) return;
    setState(s => {
      const existing = s.pantry.find(p => sameIngredient(p.name, name));
      const updatedAt = new Date().toISOString();
      return { ...s, pantry: existing ? s.pantry.map(p => p.id === existing.id ? { ...p, status: 'have', confirmedEnough: false,
        ...(p.status === 'out' || p.quantity === 0 ? { quantity: undefined, unit: undefined } : {}), updatedAt } : p)
        : [...s.pantry, { id: uid(), name: ingredientLabel(name), status: 'have', updatedAt }] };
    });
    setNewItem('');
  };
  // Ticking marks the pantry as having enough for this plan; unticking marks it out so the item returns to the list.
  const setHave = (item: GroceryItem, have: boolean) => setState(s => {
    const updatedAt = new Date().toISOString();
    const matches = (p: PantryEntry) => canonicalIngredient(p.name) === item.name;
    if (have && !s.pantry.some(matches)) return { ...s, pantry: [...s.pantry, { id: uid(), name: item.name, status: 'have', confirmedEnough: true, updatedAt }] };
    return { ...s, pantry: s.pantry.map(p => matches(p) ? { ...p, status: have ? 'have' : 'out', quantity: undefined, unit: undefined, confirmedEnough: have, updatedAt } : p) };
  });
  const dateLabel = new Date(`${state.weekOf}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const exportList = () => { const text = [`WMP — Week of ${dateLabel}`, '', ...selected.map(({ meal, recipe }) => `${recipe.name} · ${meal.servings} servings`), '', 'GROCERIES', ...groceries.map(i => `${i.status === 'covered' ? '[covered]' : '[ ]'} ${i.name}: ${amount(i.shortage)} ${i.unit} ${i.status === 'review' ? '(review needed)' : ''}`)].join('\n'); const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); const a = document.createElement('a'); a.href = url; a.download = `wmp-${state.weekOf}.txt`; a.click(); URL.revokeObjectURL(url); };
  const shoppingJson = useMemo(() => formatShoppingList(buildShoppingList(groceries, { preferStoreBrand: storeBrand })), [state, storeBrand]);
  const copyJson = async () => { try { await navigator.clipboard.writeText(shoppingJson); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { jsonRef.current?.select(); } };
  const downloadJson = () => { const url = URL.createObjectURL(new Blob([shoppingJson], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'shopping-list.json'; a.click(); URL.revokeObjectURL(url); };
  const stats = <div className="hero-stats">
    <div><strong>{needed.length + review.length}</strong><span>on your list</span></div>
    <div><strong>{covered.length}</strong><span>in pantry</span></div>
  </div>;
  return <>
    <div className="app-shell no-print">
      <section className="hero">
        <header className="topbar">
          <a className="brand" href="#" onClick={e => { e.preventDefault(); setView('week'); }}>wmp</a>
          <nav className="main-navigation" aria-label="Main navigation">
            <button className={`week-link ${view === 'week' || view === 'tonight' ? 'active' : ''}`} onClick={() => setView('week')} aria-current={view === 'week' ? 'page' : undefined}>This week</button>
            <div className="manage-navigation"><span id="manage-label">Manage</span><div className="tabs" role="group" aria-labelledby="manage-label">{([['recipes', 'Recipes'], ['pantry', 'Pantry'], ['groceries', 'Groceries']] as const).map(([key, label]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)} aria-current={view === key ? 'page' : undefined}>{label}{key === 'groceries' && needed.length + review.length > 0 && <small>{needed.length + review.length}</small>}</button>)}</div></div>
          </nav>
          <div className="topbar-right">
            <span className="status-pill" role="status"><span />{cloud ? (props.cloudMessage && !props.cloudError ? props.cloudMessage : dirty ? 'Unsaved changes' : props.account) : saveError ? 'Not saved' : 'Saved in this browser'}</span>
            {cloud ? <>
              <button className="button light compact" disabled={props.saving || props.cloudError || !dirty} onClick={() => props.onSave?.(state)}>{props.saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}</button>
              <button className="text-button" disabled={props.saving} onClick={() => { if (leaveEdits()) props.onSignOut?.(); }}>Sign out</button>
            </> : <>
              <button className="text-button" onClick={() => setResetConfirm(true)}>Reset</button>
              {props.onSignIn && <button className="button light compact" onClick={props.onSignIn}>Sign in</button>}
            </>}
          </div>
        </header>
        <div className="hero-body">
          <div>
            <label className="week-date">Week of <input aria-label="Plan week date" type="date" value={state.weekOf} disabled={props.saving} onChange={e => { if (!e.target.value) return; if (cloud) { if (leaveEdits()) props.onWeekChange?.(e.target.value); } else setState(s => ({ ...s, weekOf: e.target.value, pantry: clearConfirmation(s.pantry) })); }} /></label>
            <h1>{view === 'week' ? `${selected.length} ${selected.length === 1 ? 'meal' : 'meals'}` : view === 'tonight' ? 'Cook tonight' : view === 'recipes' ? 'Recipes' : view === 'pantry' ? 'Pantry' : 'Groceries'}</h1>
          </div>
          <div className="hero-actions">
            {stats}
            {view === 'groceries'
              ? <><button className="button ghost" onClick={exportList}>Export</button><button className="button accent" onClick={() => window.print()}>Print</button></>
              : <>{view === 'week' && <><button className="button ghost" onClick={randomizeMeals}>Randomize {mealType}</button><button className="button ghost" disabled={!selected.length} onClick={() => sheetRef.current && printRecipeSheet(sheetRef.current, setSheetSides, selected.length)}>Print recipes</button></>}<button className="button accent" onClick={() => setView('groceries')}>Review groceries <Arrow /></button></>}
          </div>
        </div>
      </section>
      <main id="main-content">
        {cloud && props.cloudMessage && props.cloudError && <div className="cloud-notice" role="alert">{props.cloudMessage}<button className="button secondary compact" onClick={() => { if (leaveEdits()) props.onReload?.(); }}>Reload saved data</button></div>}
        {!cloud && saveError && <div className="cloud-notice" role="alert">Changes could not be saved in this browser. Keep this tab open and export your list.</div>}
        <fieldset key={view} className="planner-editing" disabled={props.saving}>
        {view === 'week' && <>
          <div className="picker-modes" role="group" aria-label="Meal time">{mealTypes.map(([type, label]) => <button key={type} aria-pressed={mealType === type} onClick={() => setMealType(type)}>{label} · {selected.filter(({ recipe }) => (recipe.mealType ?? 'dinner') === type).length}</button>)}</div>
          <div className="meal-grid">
            {selected.filter(({ recipe }) => (recipe.mealType ?? 'dinner') === mealType).map(({ meal, recipe }, index) => { const image = recipeImage(recipe.id); return <article className="meal-card" key={meal.id}>
              <div className={`meal-art ${image ? 'has-photo' : `tint-${index % 4}`}`}>
                {image ? <img src={image.url} alt="" loading="lazy" /> : <span className="plate" aria-hidden="true"><PlateIcon kind={index % 4} /></span>}
                <span className="meal-meta">{recipe.bucketLabel} · {recipe.time} min</span>
                <button className="recipe-title" onClick={() => setDetail(mealEntry(recipe))}>{recipe.name}</button>
              </div>
              <div className="meal-controls">
                <div className="meal-row">
                  <div className="stepper" role="group" aria-label={`Servings for ${recipe.name}`}>
                    <button aria-label="Fewer servings" disabled={meal.servings <= 1} onClick={() => updateMeal(meal.id, { servings: Math.max(1, meal.servings - 1) })}>−</button>
                    <span>{meal.servings} servings</span>
                    <button aria-label="More servings" disabled={meal.servings >= 24} onClick={() => updateMeal(meal.id, { servings: Math.min(24, meal.servings + 1) })}>+</button>
                  </div>
                  <button className="text-button muted" aria-label={`Remove ${recipe.name}`} onClick={() => setState(s => ({ ...s, pantry: clearConfirmation(s.pantry), meals: s.meals.filter(m => m.id !== meal.id) }))}>Remove</button>
                </div>
                {!!recipe.proteins?.length && <label className="protein-select">Protein<select value={meal.proteinIndex ?? ''} onChange={e => updateMeal(meal.id, { proteinIndex: e.target.value === '' ? undefined : Number(e.target.value) })}><option value="">None</option>{recipe.proteins.map((p, i) => <option value={i} key={p.name}>{p.name}</option>)}</select></label>}
              </div>
            </article>; })}
            <button className="add-meal-card" onClick={() => openPicker('all')}><Plus />Add {mealType}</button>
          </div>
          <div className="suggestions"><CookTonight recipes={dinnerRecipes} pantry={state.pantry} servings={tonightServings} onServings={setTonightServings} onAdd={addRecipe} onPantry={() => setView('pantry')} compact onSeeAll={() => setView('tonight')} /></div>
        </>}
        {view === 'tonight' && <CookTonight recipes={dinnerRecipes} pantry={state.pantry} servings={tonightServings} onServings={setTonightServings} onAdd={addRecipe} onPantry={() => setView('pantry')} />}
        {view === 'recipes' && <RecipeBrowser recipes={recipes} plannedIds={state.meals.map(m => m.recipeId)} favorites={props.favorites} onToggleFavorite={props.onToggleFavorite} onOpen={setDetail} onAdd={addRecipe} onPlanFavorites={planFromFavorites} />}
        {view === 'pantry' && <section>
          <div className="section-heading"><h2>What’s in your kitchen?</h2><button className="button secondary compact" onClick={() => setView('tonight')}>Cook tonight</button></div>
          <p className="section-note">Optional: tag the ingredients you have. Amounts can wait until you plan your meals.</p>
          <form className="pantry-add" onSubmit={e => { e.preventDefault(); addPantry(newItem); }}><label className="sr-only" htmlFor="pantry-name">Pantry item</label><input id="pantry-name" list="ingredient-options" value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Add an item, e.g. olive oil" required /><datalist id="ingredient-options">{ingredientSearch.map(item => <option key={item.id} value={item.name} />)}</datalist><button className="button primary" type="submit">Add</button></form>
          <section className="quick-add">
            <button className="quick-add-toggle" aria-expanded={quickAdd} onClick={() => setQuickAdd(o => !o)}><span><strong>Common items</strong><small>Add what you have. New suggestions appear as you go.</small></span><span aria-hidden="true">{quickAdd ? '−' : '+'}</span></button>
            {quickAdd && commonSuggestions.map(({ group, items }) => <div className="quick-group" key={group}>
              <h3>{group}</h3><div className="chips">{items.map(({ name }) => {
                const added = addingCommon.has(ingredientIdentity(name));
                return <button key={name} className={`chip${added ? ' chip-added' : ''}`} aria-label={added ? `${name} added to your items` : `Add ${name} to your items`} aria-disabled={added} onClick={() => addCommon(name)}>{added ? '✓' : '+'} {name}</button>;
              })}</div>
            </div>)}
            {quickAdd && commonSuggestions.length === 0 && <p className="section-note">{newItem.trim() ? 'No new common items match. You can still add an item above.' : 'You’ve added all the common items. Add anything else above, or update Your items below.'}</p>}
          </section>
          <div className="section-heading"><h2>Your items <span>{state.pantry.length}</span></h2></div>
          <p className="section-note">Your kitchen carries across weeks. Ingredients stay on your shopping list until an amount or “Enough for this plan” confirms coverage.</p>
          <div className="pantry-list">{state.pantry.map(p => <article className="pantry-card" key={p.id}><div className="pantry-name"><h3>{p.name}</h3><small>Checked {new Date(p.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small></div><div className="pantry-status" role="group" aria-label={`Status of ${p.name}`}>{([['have', 'Have it'], ['low', 'Running low'], ['out', 'Out']] as const).map(([value, label]) => <button key={value} aria-pressed={p.status === value} className={p.status === value ? `selected ${value}` : ''} onClick={() => updatePantry(p.id, { status: value, quantity: value === 'out' ? undefined : p.quantity, unit: value === 'out' ? undefined : p.unit, confirmedEnough: false })}>{label}</button>)}</div><div className="pantry-details"><label>Amount <input type="number" min="0" step="any" placeholder="Optional" aria-label={`Amount of ${p.name}`} value={p.quantity ?? ''} onChange={e => updatePantry(p.id, { quantity: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)), confirmedEnough: false })} /></label><label>Unit <input placeholder="e.g. g, cup" aria-label={`Unit for ${p.name}`} value={p.unit ?? ''} onChange={e => updatePantry(p.id, { unit: e.target.value, confirmedEnough: false })} /></label>{p.status === 'have' && p.quantity === undefined && <label className="check-label"><input type="checkbox" checked={!!p.confirmedEnough} onChange={e => updatePantry(p.id, { confirmedEnough: e.target.checked })} />Enough for this plan</label>}<button className="text-button muted" aria-label={`Delete ${p.name} from pantry`} onClick={() => setState(s => ({ ...s, pantry: s.pantry.filter(x => x.id !== p.id) }))}>Remove</button></div></article>)}</div>
          {!state.pantry.length && <p className="empty-state">No pantry items yet.</p>}
        </section>}
        {view === 'groceries' && <section>
          {!groceries.length && <div className="empty-state">No meals planned yet.<br /><button className="button primary" onClick={() => { setView('week'); openPicker('pantry'); }}>Add a meal</button></div>}
          {([{ title: 'Shopping list', items: groceries.filter(item => item.status !== 'covered'), kind: 'needed', description: 'Everything still needed for your meals. Check the notes beside uncertain amounts, or mark an item “Have enough” to remove it.' }, { title: 'In your pantry', items: covered, kind: 'covered', description: 'Already on hand for this plan. Untick to put an item back on the list.' }]).filter(g => g.items.length).map(group => <section className={`grocery-group ${group.kind}`} key={group.kind}><div className="section-heading"><h2>{group.title} <span>{group.items.length}</span></h2></div><p className="section-note">{group.description}</p><div className="grocery-list">{group.items.map(item => <article className={`grocery-item ${item.status}`} key={item.id}><span className="grocery-indicator" aria-hidden="true">{item.status === 'covered' ? '✓' : item.status === 'review' ? '?' : ''}</span><div className="grocery-name"><h3>{item.name}</h3><p>{item.meals.join(' · ')}</p>{item.status === 'review' && <small><strong>Check amount:</strong> {item.reasons.join(' ')}</small>}</div><div className="grocery-quantity">{amount(item.shortage)} {item.shortage !== null && item.unit}<small>{item.covered > 0 ? `${amount(item.covered)} ${item.unit} from pantry` : item.category}</small></div><label className="have-check"><input type="checkbox" checked={item.status === 'covered'} onChange={e => setHave(item, e.target.checked)} /> Have enough</label></article>)}</div></section>)}
          {needed.length + review.length > 0 && <section className="grocery-group shopping-json no-print"><div className="section-heading"><h2>Shopping list JSON</h2><div className="json-actions"><button className="button secondary compact" onClick={copyJson}>{copied ? 'Copied' : 'Copy'}</button><button className="button secondary compact" onClick={downloadJson}>Download</button></div></div><p className="section-note">Your shopping list, including any amounts that still need checking. Paste into a shopping assistant.</p><label className="json-option"><input type="checkbox" checked={storeBrand} onChange={e => setStoreBrand(e.target.checked)} /> Prefer store brand</label><textarea ref={jsonRef} readOnly aria-label="Shopping list JSON" value={shoppingJson} rows={12} onFocus={e => e.currentTarget.select()} /></section>}
        </section>}
        </fieldset>
      </main>
    </div>
    {picker && <div className="modal-backdrop no-print" onMouseDown={e => { if (e.target === e.currentTarget) setPicker(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="picker-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') setPicker(false); }}><div className="section-heading"><h2 id="picker-title">Add {mealType}</h2><button className="close-button" aria-label="Close recipe picker" onClick={() => setPicker(false)}>×</button></div><input className="search-input" autoFocus placeholder="Search recipes or ingredients" aria-label="Search recipes" value={search} onChange={e => setSearch(e.target.value)} /><div className="picker-modes" role="group" aria-label="Sort recipes">{([['pantry', `From your pantry${suggestions.length ? ` · ${suggestions.length}` : ''}`], ['all', 'All recipes']] as const).map(([mode, label]) => <button key={mode} aria-pressed={pickerMode === mode} disabled={mode === 'pantry' && !suggestions.length} onClick={() => setPickerMode(mode)}>{label}</button>)}</div>{pickerMode === 'pantry' && <><p className="picker-hint">Based on your tags. Check quantities and any protein add-ons before cooking; the grocery list checks the whole week.</p><label className="suggestion-filter">Show <select value={suggestionFilter} onChange={e => setSuggestionFilter(e.target.value as SuggestionGroup | 'all')}><option value="all">All matches</option>{(Object.entries(suggestionGroupLabel) as [SuggestionGroup, string][]).map(([key, label]) => <option value={key} key={key}>{label} ({suggestions.filter(s => s.group === key).length})</option>)}</select></label></>}<div className="recipe-results">{pickerMode === 'pantry' && suggestionFilter !== 'all' && !suggestions.some(s => s.group === suggestionFilter) && <p className="empty-state">No recipes in this group yet. Try all matches or add more kitchen items.</p>}{((pickerMode === 'pantry' ? suggestions.filter(s => suggestionFilter === 'all' || s.group === suggestionFilter) : recipes.map(recipe => ({ recipe }))) as ({ recipe: Recipe } | Suggestion)[]).filter(({ recipe: r }) => (r.mealType ?? 'dinner') === mealType).filter(({ recipe: r }) => `${r.name} ${r.ingredients.map(i => i.name).join(' ')}`.toLowerCase().includes(search.toLowerCase())).map(item => { const r = item.recipe; const sg = 'coverage' in item ? item : undefined; return <article key={r.id}><div><small>{r.bucketLabel} · {r.time} min{sg && <> · <span className="match-have">{suggestionGroupLabel[sg.group]} · {matchLabel(sg)}</span></>}</small><h3>{r.name}</h3><p>{sg ? missingLabel(sg) : r.description}</p></div><button className="button secondary compact" onClick={() => addRecipe(r)}>+ Add</button></article>; })}</div></section></div>}
    {detail && (() => { const image = recipeImage(detail.id); const favorite = !!props.favorites?.includes(detail.id); return <div className="modal-backdrop no-print" onMouseDown={e => { if (e.target === e.currentTarget) setDetail(null); }}><section className="modal recipe-detail" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') setDetail(null); }}>
      <div className="section-heading"><h2 id="detail-title">{detail.name}</h2><div className="detail-actions">{detail.recipe && props.onToggleFavorite && <button className="favorite-button" aria-pressed={favorite} aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'} onClick={() => props.onToggleFavorite?.(detail.id)}><Heart filled={favorite} /></button>}<button autoFocus className="close-button" aria-label="Close recipe" onClick={() => setDetail(null)}>×</button></div></div>
      {image && <figure className="detail-photo"><img src={image.url} alt="" /><figcaption>Photo of a similar dish: <a href={image.sourceUrl} target="_blank" rel="noreferrer">{image.author}, {image.license}, Wikimedia Commons</a></figcaption></figure>}
      <p>{detail.facts.join(' · ')}</p>
      {detail.description && <p>{detail.description}</p>}
      <h3>Ingredients</h3><ul>{detail.ingredients.map(i => <li key={i.id}>{amount(i.amount)} {i.unit} {i.name}</li>)}</ul>
      <h3>Method</h3><ol>{detail.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
      {detail.sections.map(group => <div key={group.title}><h3>{group.title}</h3><ul>{group.lines.map((line, i) => <li key={i}>{line}</li>)}</ul></div>)}
    </section></div>; })()}
    {resetConfirm && <div className="modal-backdrop no-print"><section className="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><h2 id="reset-title">Reset sample data?</h2><p>This replaces the plan and pantry saved in this browser with the sample data.</p><div className="bottom-action"><button autoFocus className="button secondary" onClick={() => setResetConfirm(false)}>Cancel</button><button className="button primary" onClick={() => { setState(createSamplePlanner()); setResetConfirm(false); }}>Reset</button></div></section></div>}
    <RecipeSheet ref={sheetRef} weekLabel={dateLabel} meals={selected} sides={sheetSides} />
    <div className="print-only"><h1>wmp</h1><p>Week of {dateLabel} · {selected.length} meals</p><h2>Shopping list</h2>{groceries.filter(i => i.status !== 'covered').map(i => <p key={i.id}>□ {i.name} — {amount(i.shortage)} {i.shortage !== null && i.unit}{i.status === 'review' ? ` · CHECK: ${i.reasons.join(' ')}` : ''}</p>)}{covered.length > 0 && <p>In pantry: {covered.map(i => i.name).join(', ')}</p>}{selected.map(({ meal, recipe }) => <section className="print-recipe" key={meal.id}><h2>{recipe.name}</h2><p>{recipe.time} minutes · {meal.servings} servings</p><ul>{recipe.ingredients.map(i => <li key={i.id}>{amount(i.amount === null ? null : i.amount * meal.servings / recipe.servings)} {i.unit} {i.name}</li>)}</ul>{meal.proteinIndex !== undefined && recipe.proteins?.[meal.proteinIndex] && <p><strong>Protein:</strong> {recipe.proteins[meal.proteinIndex].name} · Base recipe amount: {recipe.proteins[meal.proteinIndex].amount}. Scale by {amount(meal.servings / recipe.servings)}×. {recipe.proteins[meal.proteinIndex].instructions}</p>}<ol>{recipe.steps.map((step, i) => <li key={i}>{step}</li>)}</ol></section>)}</div>
  </>;
}

const Arrow = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const Plus = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
// Line drawings for the meal card plates: taco, bowl, skillet, noodles.
const plates = [
  <><path d="M8 30c0-9 7-16 16-16s16 7 16 16" /><path d="M6 30h36" /><path d="M16 24c2-2 4-2 6 0M26 22c2-2 4-2 6 0" /></>,
  <><path d="M8 22h32c0 10-7 17-16 17S8 32 8 22z" /><path d="M16 17c0-3 3-5 5-5M26 15c1-3 4-4 6-3" /></>,
  <><circle cx="24" cy="24" r="15" /><circle cx="19" cy="21" r="3.5" /><circle cx="29" cy="27" r="3.5" /></>,
  <><path d="M10 26h28c0 7-6 12-14 12s-14-5-14-12z" /><path d="M15 21c3-4 6 0 9-4s6 0 9-4" /></>,
];
const PlateIcon = ({ kind }: { kind: number }) => <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">{plates[kind]}</svg>;
