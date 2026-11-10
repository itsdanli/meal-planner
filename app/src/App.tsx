import { useEffect, useMemo, useRef, useState } from 'react';
import { recipes as libraryRecipes } from './data';
import { calculateGroceries, groceryIngredientName } from './grocery';
import { createSamplePlanner, loadPlanner, savePlanner } from './storage';
import type { GroceryItem, Meal, MealType, PantryEntry, PlannerState, Recipe } from './types';
import './styles.css';
import PantryUnit from './PantryUnit';
import SelectionTabs from './SelectionTabs';
import { normalizeWeek } from './cloud';
import { rankTonight } from './tonightMatching';
import { formatAmount, scaledProteinAmount } from './quantities';
import { suggestRecipes, suggestionGroupLabel, type Suggestion, type SuggestionGroup } from './suggest';
import { ingredientIdentity, ingredientLabel, ingredientOptions, sameIngredient, searchIngredients } from './ingredients';
import { rankedCommonItems, suggestedCommonItems } from './pantrySeeds';
import { pickRandomRecipes } from './randomMeals';
import CookTonight from './CookTonight';
import RecipeSheet, { printRecipeSheet } from './RecipeSheet';
import RecipeBrowser, { Heart } from './RecipeBrowser';
import { mealEntry, recipeImage, type LibraryEntry } from './library';
import { buildShoppingList, formatShoppingList } from './shoppingList';

type View = 'tonight' | 'week' | 'recipes' | 'pantry' | 'groceries';
const amount = formatAmount;
const STORE_BRAND_KEY = 'wmp.preferStoreBrand';
const uid = () => crypto.randomUUID();
const matchLabel = (s: Suggestion) => `${s.have.length} ingredients saved in your kitchen${s.low.length ? ` · ${s.low.length} running low` : ''}`;
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
  const [state, setPlannerState] = useState<PlannerState>(() => props.initialState ?? loadPlanner());
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
  const householdKey = `wmp.householdServings:${props.account ?? 'local'}`;
  const [tonightServings, setTonightServingsValue] = useState(() => {
    try { const saved = Number(localStorage.getItem(householdKey)); if (saved >= 1 && saved <= 24) return saved; } catch { /* Use the existing plan default. */ }
    return state.meals[0]?.servings ?? 4;
  });
  const setTonightServings = (value: number) => { setTonightServingsValue(value); try { localStorage.setItem(householdKey, String(value)); } catch { /* Applies for this visit. */ } };
  const [undo, setUndo] = useState<{ message: string; restore: () => void } | null>(null);
  const setState = (change: PlannerState | ((previous: PlannerState) => PlannerState)) => { setUndo(null); setPlannerState(change); };
  const changeWithUndo = (message: string, change: (previous: PlannerState) => PlannerState) => {
    const previous = structuredClone(state);
    setPlannerState(change);
    setUndo({ message, restore: () => setPlannerState(previous) });
  };
  const [replacing, setReplacing] = useState<string | null>(null);
  const [detailMealId, setDetailMealId] = useState<string | null>(null);
  const [detailServings, setDetailServings] = useState(4);
  const [detailProtein, setDetailProtein] = useState<number | undefined>();
  const modalTrigger = useRef<HTMLElement | null>(null);
  const rememberTrigger = () => { modalTrigger.current = document.activeElement as HTMLElement | null; };
  const openDetail = (entry: LibraryEntry, meal?: Meal) => { rememberTrigger(); setDetailMealId(meal?.id ?? null); setDetailServings(meal?.servings ?? entry.recipe?.servings ?? 4); setDetailProtein(meal?.proteinIndex); setDetail(entry); };
  const boughtKey = `wmp.bought:${props.account ?? 'local'}:${state.weekOf}`;
  const requirementsKey = JSON.stringify(state.meals);
  const [bought, setBought] = useState<string[]>([]);
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(boughtKey) ?? 'null'); setBought(saved?.requirements === requirementsKey && Array.isArray(saved.items) ? saved.items.filter((id: unknown) => typeof id === 'string') : []); } catch { setBought([]); } }, [boughtKey, requirementsKey]);
  const markBought = (id: string, checked: boolean) => {
    const previous = bought;
    const persist = (items: string[]) => { setBought(items); try { localStorage.setItem(boughtKey, JSON.stringify({ requirements: requirementsKey, items })); } catch { /* Shopping progress still works for this visit. */ } };
    persist(checked ? [...bought.filter(item => item !== id), id] : bought.filter(item => item !== id));
    setUndo({ message: checked ? 'Marked bought. Pantry unchanged.' : 'Returned to shopping list.', restore: () => persist(previous) });
  };
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [quickAdd, setQuickAdd] = useState(() => (props.initialState ?? loadPlanner()).pantry.length < 8);
  const [addingCommon, setAddingCommon] = useState<Set<string>>(() => new Set());
  const commonTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => () => { commonTimers.current.forEach(clearTimeout); }, []);
  const [pickerMode, setPickerMode] = useState<'pantry' | 'all'>('pantry');
  const [readyOnly, setReadyOnly] = useState(false);
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
    const previous = modalTrigger.current ?? document.activeElement as HTMLElement | null;
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
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = previousOverflow; if (shell) shell.inert = false; if (previous?.isConnected) previous.focus(); modalTrigger.current = null; };
  }, [modalOpen]);
  const groceries = useMemo(() => calculateGroceries(recipes, state.meals, state.pantry), [state]);
  const needed = groceries.filter(i => i.status === 'needed');
  const review = groceries.filter(i => i.status === 'review');
  const covered = groceries.filter(i => i.status === 'covered');
  const selected = state.meals.map(meal => ({ meal, recipe: meal.recipeSnapshot ?? recipes.find(r => r.id === meal.recipeId) })).filter((x): x is { meal: Meal; recipe: Recipe } => !!x.recipe);
  const suggestions = useMemo(() => suggestRecipes(recipes.filter(r => (r.mealType ?? 'dinner') === mealType), state.pantry, true).filter(s => !state.meals.some(m => m.recipeId === s.recipe.id)), [recipes, state.pantry, state.meals, mealType]);
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
  const addRecipe = (r: Recipe, servings = tonightServings, proteinIndex?: number) => {
    if (replacing && picker) {
      const old = state.meals.find(meal => meal.id === replacing);
      changeWithUndo(`Replaced ${selected.find(item => item.meal.id === replacing)?.recipe.name ?? 'meal'} with ${r.name}.`, previous => ({ ...previous, pantry: clearConfirmation(previous.pantry), meals: previous.meals.map(meal => meal.id === replacing ? { ...meal, recipeId: r.id, recipeSnapshot: structuredClone(r), servings: old?.servings ?? servings, proteinIndex: undefined } : meal) }));
      setPicker(false); setReplacing(null); setSearch(''); return;
    } setState(s => ({ ...s, pantry: clearConfirmation(s.pantry), meals: [...s.meals, { id: uid(), recipeId: r.id, servings, proteinIndex, recipeSnapshot: structuredClone(r) }] })); setPicker(false); setSearch(''); setMealType(r.mealType ?? 'dinner'); setView('week'); };
  const randomizeMeals = () => changeWithUndo(`Randomized ${mealType} meals.`, s => ({ ...s, pantry: clearConfirmation(s.pantry), meals: [...s.meals.filter(m => ((m.recipeSnapshot ?? recipes.find(r => r.id === m.recipeId))?.mealType ?? 'dinner') !== mealType), ...pickRandomRecipes(recipes.filter(r => (r.mealType ?? 'dinner') === mealType), 3, s.meals.map(m => m.recipeId)).map(r => ({ id: uid(), recipeId: r.id, servings: tonightServings, recipeSnapshot: structuredClone(r) }))] }));
  const planFromFavorites = (list: Recipe[]) => { changeWithUndo('Planned meals from favorites.', s => ({ ...s, pantry: clearConfirmation(s.pantry), meals: pickRandomRecipes(list, 3, s.meals.map(m => m.recipeId)).map(r => ({ id: uid(), recipeId: r.id, servings: tonightServings, recipeSnapshot: structuredClone(r) })) })); setView('week'); };
  const openPicker = (mode: 'pantry' | 'all', mealId: string | null = null) => { rememberTrigger(); setReplacing(mealId); setReadyOnly(false); setSearch(''); setPickerMode(suggestions.length ? mode : 'all'); setSuggestionFilter('all'); setPicker(true); };
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
    setNewItem(''); if (state.pantry.length >= 3) setQuickAdd(false);
  };
  // Ticking marks the pantry as having enough for this plan; unticking marks it out so the item returns to the list.
  const setHave = (item: GroceryItem, have: boolean) => changeWithUndo(have ? `${item.name}: enough for this plan. Rechecked when meals change.` : `${item.name}: coverage confirmation removed.`, s => {
    const updatedAt = new Date().toISOString();
    const matches = (p: PantryEntry) => groceryIngredientName(p.name) === item.name;
    if (have && !s.pantry.some(matches)) return { ...s, pantry: [...s.pantry, { id: uid(), name: item.name, status: 'have', confirmedEnough: true, updatedAt }] };
    return { ...s, pantry: s.pantry.map(p => matches(p) ? { ...p, status: 'have', quantity: undefined, unit: undefined, confirmedEnough: have, updatedAt } : p) };
  });
  const changeWeek = (date: string) => {
    if (!date) return;
    const week = normalizeWeek(date);
    if (cloud) { if (leaveEdits()) props.onWeekChange?.(week); }
    else setState(previous => ({ ...previous, weekOf: week, pantry: clearConfirmation(previous.pantry) }));
  };
  const shiftWeek = (days: number) => { const date = new Date(`${state.weekOf}T12:00:00`); date.setDate(date.getDate() + days); changeWeek(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`); };
  const weekEnd = new Date(`${state.weekOf}T12:00:00`); weekEnd.setDate(weekEnd.getDate() + 6);
  const weekRange = `${new Date(`${state.weekOf}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const currentWeek = normalizeWeek(new Date());
  const chooseIngredient = (name: string, choice: string) => changeWithUndo(`Chose ${choice} for ${name}.`, previous => ({ ...previous, pantry: clearConfirmation(previous.pantry), meals: previous.meals.map(meal => {
    const recipe = meal.recipeSnapshot ?? recipes.find(item => item.id === meal.recipeId);
    if (!recipe) return meal;
    return { ...meal, recipeSnapshot: { ...recipe, ingredients: recipe.ingredients.map(item => groceryIngredientName(item.name) === name ? { ...item, name: choice } : item) } };
  }) }));
  const dateLabel = new Date(`${state.weekOf}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const exportList = () => { const text = [`WMP — Week of ${dateLabel}`, '', ...selected.map(({ meal, recipe }) => `${recipe.name} · ${meal.servings} servings`), '', 'GROCERIES', ...groceries.map(i => `${i.status === 'covered' ? '[covered]' : '[ ]'} ${i.name}: ${amount(i.shortage)} ${i.unit} ${i.status === 'review' ? '(review needed)' : ''}`)].join('\n'); const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); const a = document.createElement('a'); a.href = url; a.download = `wmp-${state.weekOf}.txt`; a.click(); URL.revokeObjectURL(url); };
  const shoppingJson = useMemo(() => formatShoppingList(buildShoppingList(groceries, { preferStoreBrand: storeBrand })), [state, storeBrand]);
  const copyJson = async () => { try { await navigator.clipboard.writeText(shoppingJson); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { jsonRef.current?.select(); } };
  const downloadJson = () => { const url = URL.createObjectURL(new Blob([shoppingJson], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'shopping-list.json'; a.click(); URL.revokeObjectURL(url); };
  const pickerServings = replacing ? state.meals.find(meal => meal.id === replacing)?.servings ?? tonightServings : tonightServings;
  const readyIds = useMemo(() => new Set(picker ? rankTonight(recipes, state.pantry, pickerServings).filter(item => item.readiness === 'ready').map(item => item.recipe.id) : []), [recipes, state.pantry, pickerServings, picker]);
  const pickerResults = ((pickerMode === 'pantry' ? suggestions.filter(item => suggestionFilter === 'all' || item.group === suggestionFilter) : recipes.map(recipe => ({ recipe }))) as ({ recipe: Recipe } | Suggestion)[])
    .filter(({ recipe }) => (recipe.mealType ?? 'dinner') === mealType && !state.meals.some(meal => meal.recipeId === recipe.id))
    .filter(({ recipe }) => !readyOnly || readyIds.has(recipe.id))
    .filter(({ recipe }) => `${recipe.name} ${recipe.ingredients.map(item => item.name).join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()));
  const groceryGroups = [...new Set(groceries.map(item => item.category))].sort().map(category => ({ category, items: groceries.filter(item => item.category === category) }));
  const stats = <div className="hero-stats">
    <div><strong>{needed.length + review.length}</strong><span>on your list</span></div>
    <div><strong>{new Set(covered.map(item => item.name)).size}</strong><span>ingredients covered for this plan</span></div>
  </div>;
  return <>
    <div className="app-shell no-print">
      <section className="hero">
        <header className="topbar">
          <a className="brand" href="#" onClick={e => { e.preventDefault(); setView('week'); }}>wmp</a>
          <nav className="main-navigation" aria-label="Main navigation">
            <button className={`week-link ${view === 'week' || view === 'tonight' ? 'active' : ''}`} onClick={() => setView('week')} aria-current={view === 'week' ? 'page' : undefined}>Plan</button>
            <div className="manage-navigation"><span id="manage-label">Manage</span><div className="tabs" role="group" aria-labelledby="manage-label">{([['recipes', 'Recipes'], ['pantry', 'Pantry'], ['groceries', 'Groceries']] as const).map(([key, label]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)} aria-current={view === key ? 'page' : undefined}>{label}{key === 'groceries' && needed.length + review.length > 0 && <small>{needed.length + review.length}</small>}</button>)}</div></div>
          </nav>
          <div className="topbar-right">
            <span className="status-pill" role="status"><span />{cloud ? (props.cloudMessage && !props.cloudError ? props.cloudMessage : dirty ? 'Unsaved changes' : props.account) : saveError ? 'Not saved' : 'Saved on this device'}</span>
            {cloud ? <>
              <button className="button light compact" disabled={props.saving || props.cloudError || !dirty} onClick={() => props.onSave?.(state)}>{props.saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}</button>
              <button className="text-button" disabled={props.saving} onClick={() => { if (leaveEdits()) props.onSignOut?.(); }}>Sign out</button>
            </> : <>

              {props.onSignIn && <button className="button light compact" onClick={props.onSignIn}>Sign in</button>}
            </>}
          </div>
        </header>
        <div className="hero-body">
          <div>
            <label className="week-date">Week of <input aria-label="Plan week date" type="date" value={state.weekOf} disabled={props.saving} onChange={e => changeWeek(e.target.value)} /></label>
            <h1>{view === 'week' ? `Your plan for ${weekRange}` : view === 'tonight' ? 'Cook tonight' : view === 'recipes' ? 'Recipes' : view === 'pantry' ? 'Pantry' : 'Groceries'}</h1>
            {view === 'week' && <p className="plan-summary">{selected.length} meals total · {selected.filter(({ recipe }) => (recipe.mealType ?? 'dinner') === mealType).length} {mealType === 'breakfast' ? 'breakfasts' : `${mealType}s`} shown{state.weekOf < currentWeek ? ' · Past week' : state.weekOf > currentWeek ? ' · Future week' : ''}</p>}
            <div className="week-navigation"><button onClick={() => shiftWeek(-7)} disabled={props.saving} aria-label="Previous week">← Previous</button><button onClick={() => changeWeek(currentWeek)} disabled={props.saving}>This week</button><button onClick={() => shiftWeek(7)} disabled={props.saving} aria-label="Next week">Next →</button></div>
          </div>
          <div className="hero-actions">
            {stats}
            {view === 'groceries'
              ? <><button className="button ghost" onClick={exportList}>Export</button><button className="button accent" onClick={() => window.print()}>Print</button></>
              : <>{view === 'week' && <>
<details className="secondary-actions"><summary>More actions</summary>          <label className="household-servings">Household servings <select aria-label="Household servings" value={tonightServings} onChange={e => setTonightServings(Number(e.target.value))}>{Array.from({ length: 24 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select><small>Default for new meals and Cook tonight; existing meals keep their servings.</small></label><button className="button ghost" onClick={randomizeMeals}>Randomize {mealType}</button><button className="button ghost" disabled={!selected.length} onClick={() => sheetRef.current && printRecipeSheet(sheetRef.current, setSheetSides, selected.length)}>Print recipes</button>{!cloud && <button className="button ghost" onClick={() => { rememberTrigger(); setResetConfirm(true); }}>Reset plan and pantry</button>}</details></>}<button className="button accent" onClick={() => setView('groceries')}>Review groceries <Arrow /></button></>}
          </div>
        </div>
      </section>
      <main id="main-content">
        {cloud && props.cloudMessage && props.cloudError && <div className="cloud-notice" role="alert">{props.cloudMessage}<button className="button secondary compact" onClick={() => { if (leaveEdits()) props.onReload?.(); }}>Reload saved data</button></div>}
        {!cloud && saveError && <div className="cloud-notice" role="alert">Changes could not be saved in this browser. Keep this tab open and export your list.</div>}
        <fieldset key={view} className="planner-editing" disabled={props.saving}>
        {view === 'week' && <>
          <SelectionTabs label="Meal time" value={mealType} onChange={setMealType} panelId="planned-meals" options={mealTypes.map(([type, label]) => [type, `${label} · ${selected.filter(({ recipe }) => (recipe.mealType ?? 'dinner') === type).length}`] as const)} />
          <div className="meal-grid" id="planned-meals" role="tabpanel" aria-label={`${mealType} meals`}>
            {selected.filter(({ recipe }) => (recipe.mealType ?? 'dinner') === mealType).map(({ meal, recipe }, index) => { const image = recipeImage(recipe.id); return <article className="meal-card" key={meal.id}>
              <div className={`meal-art ${image ? 'has-photo' : `tint-${index % 4}`}`}>
                {image ? <img src={image.url} alt="" loading="lazy" /> : <span className="plate" aria-hidden="true"><PlateIcon kind={index % 4} /></span>}
                <span className="meal-meta">{recipe.bucketLabel} · {recipe.time} min</span>
                <button className="recipe-title" onClick={() => openDetail(mealEntry(recipe), meal)}>{recipe.name}</button>
              </div>
              <div className="meal-controls">
                <div className="meal-row">
                  <div className="stepper" role="group" aria-label={`Servings for ${recipe.name}`}>
                    <button aria-label="Fewer servings" disabled={meal.servings <= 1} onClick={() => updateMeal(meal.id, { servings: Math.max(1, meal.servings - 1) })}>−</button>
                    <span>{meal.servings} servings</span>
                    <button aria-label="More servings" disabled={meal.servings >= 24} onClick={() => updateMeal(meal.id, { servings: Math.min(24, meal.servings + 1) })}>+</button>
                  </div>
                  <button className="text-button" onClick={() => openPicker('all', meal.id)}>Replace meal</button><button className="text-button muted" aria-label={`Remove ${recipe.name}`} onClick={() => changeWithUndo(`Removed ${recipe.name}.`, s => ({ ...s, pantry: clearConfirmation(s.pantry), meals: s.meals.filter(m => m.id !== meal.id) }))}>Remove</button>
                </div>
                {!!recipe.proteins?.length && <label className="protein-select">Add protein optional<select value={meal.proteinIndex ?? ''} onChange={e => updateMeal(meal.id, { proteinIndex: e.target.value === '' ? undefined : Number(e.target.value) })}><option value="">No extra protein</option>{recipe.proteins.map((p, i) => <option value={i} key={p.name}>{p.name}</option>)}</select></label>}
              </div>
            </article>; })}
            <button className="add-meal-card" onClick={() => openPicker('all')}><Plus />Add {mealType}</button>
          </div>
          <div className="suggestions"><CookTonight recipes={dinnerRecipes} pantry={state.pantry} servings={tonightServings} onServings={setTonightServings} onAdd={addRecipe} onPantry={() => setView('pantry')} compact onSeeAll={() => setView('tonight')} /></div>
        </>}
        {view === 'tonight' && <CookTonight recipes={dinnerRecipes} pantry={state.pantry} servings={tonightServings} onServings={setTonightServings} onAdd={addRecipe} onPantry={() => setView('pantry')} />}
        {view === 'recipes' && <RecipeBrowser recipes={recipes} plannedIds={state.meals.map(m => m.recipeId)} favorites={props.favorites} onToggleFavorite={props.onToggleFavorite} onOpen={openDetail} onAdd={addRecipe} onPlanFavorites={planFromFavorites} />}
        {view === 'pantry' && <section>
          <div className="section-heading"><h2>What’s in your kitchen?</h2><button className="button secondary compact" onClick={() => setView('tonight')}>Cook tonight</button></div>
          <p className="section-note">Optional: tag the ingredients you have. Amounts can wait until you plan your meals.</p>
          <form className="pantry-add" onSubmit={e => { e.preventDefault(); addPantry(newItem); }}><label className="sr-only" htmlFor="pantry-name">Pantry item</label><input id="pantry-name" list="ingredient-options" value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Add an item, e.g. olive oil" required /><datalist id="ingredient-options">{ingredientSearch.map(item => <option key={item.id} value={item.name} />)}</datalist><button className="button primary" type="submit">Add</button></form>
          <div className="section-heading"><h2>{state.pantry.length} kitchen items saved</h2></div>
          <p className="section-note">Your kitchen carries across weeks. Ingredients stay on your shopping list until an amount or “Enough for this plan” confirms coverage.</p>
          <div className="pantry-list">{state.pantry.map(p => <article className="pantry-card" key={p.id}><div className="pantry-name"><h3>{p.name}</h3><small>{p.status === 'out' ? 'Out' : p.confirmedEnough ? 'Enough for this plan' : p.status === 'low' ? `Need more · running low${p.quantity === undefined ? ' · amount unknown' : ''}` : p.quantity === undefined ? 'Have it · amount unknown' : 'Amount saved · plan coverage checked separately'} · Checked {new Date(p.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small></div><div className="pantry-status" role="radiogroup" aria-label={`Status of ${p.name}`}>{([['have', 'Have it'], ['low', 'Running low'], ['out', 'Out']] as const).map(([value, label]) => <button key={value} role="radio" aria-checked={p.status === value} tabIndex={p.status === value ? 0 : -1} onKeyDown={e => { const values = ['have', 'low', 'out'] as const; const index = values.indexOf(p.status); const next = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (index + 1) % 3 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (index + 2) % 3 : -1; if (next < 0) return; e.preventDefault(); updatePantry(p.id, { status: values[next], confirmedEnough: false, ...(values[next] === 'out' ? { quantity: undefined, unit: undefined } : {}) }); (e.currentTarget.parentElement?.children[next] as HTMLElement)?.focus(); }} className={p.status === value ? `selected ${value}` : ''} onClick={() => updatePantry(p.id, { status: value, quantity: value === 'out' ? undefined : p.quantity, unit: value === 'out' ? undefined : p.unit, confirmedEnough: false })}>{label}</button>)}</div><div className="pantry-details"><label>Amount <input type="number" min="0" step="any" placeholder="Optional" aria-label={`Amount of ${p.name}`} value={p.quantity ?? ''} onChange={e => updatePantry(p.id, { quantity: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)), confirmedEnough: false })} /></label><PantryUnit name={p.name} value={p.unit ?? ''} suggestions={[...groceries.filter(item => sameIngredient(item.name, p.name)).map(item => item.unit || 'each'), 'g', 'oz', 'cup', 'each']} onChange={unit => updatePantry(p.id, { unit, confirmedEnough: false })} />{p.status === 'have' && p.quantity === undefined && <label className="check-label"><input type="checkbox" aria-label={`Enough ${p.name} for this plan`} checked={!!p.confirmedEnough} onChange={e => updatePantry(p.id, { confirmedEnough: e.target.checked })} />Enough for this plan</label>}<button className="text-button muted" aria-label={`Delete ${p.name} from pantry`} onClick={() => setState(s => ({ ...s, pantry: s.pantry.filter(x => x.id !== p.id) }))}>Remove</button></div></article>)}</div>
          {!state.pantry.length && <p className="empty-state">No pantry items yet.</p>}
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

        </section>}
        {view === 'groceries' && <section>
          {!groceries.length && <div className="empty-state">No meals planned yet.<br /><button className="button primary" onClick={() => { setView('week'); openPicker('pantry'); }}>Add a meal</button></div>}
          <p className="section-note">For all {selected.length} planned meals · Already have confirms coverage for this plan only. Bought tracks this shopping trip and never changes pantry inventory.</p>
          {groceryGroups.map(({ category, items }) => <section className="grocery-group" key={category}><h2>{category}</h2><div className="grocery-list">{[...new Set(items.map(item => item.name))].map(name => <div className="ingredient-group" key={name}><h3>{name}</h3>{ingredientOptions(name).length > 1 && <label>Choose ingredient <select aria-label={`Choose ingredient for ${name}`} value="" onChange={e => chooseIngredient(name, e.target.value)}><option value="" disabled>Choose one…</option>{ingredientOptions(name).map(choice => <option key={choice} value={choice}>{choice}</option>)}</select></label>}{items.filter(item => item.name === name).map(item => <article className={`grocery-item ${item.status} ${bought.includes(item.id) ? 'bought' : ''}`} key={item.id}>
            <div className="grocery-name"><details><summary>Meal breakdown · {item.meals.length} {item.meals.length === 1 ? 'meal' : 'meals'}</summary><ul>{item.contributions?.map((source, index) => <li key={index}>{source.recipe}: {amount(source.amount)} {source.unit} {source.name}</li>)}</ul></details>
            {item.status === 'review' && <details className="amount-review"><summary>Check amount</summary>{item.reasons.map(reason => <p key={reason}>{reason}</p>)}{state.pantry.some(entry => entry.status !== 'out' && sameIngredient(entry.name, item.name)) && <p>You have {item.name} saved. Confirm you have {amount(item.needed)} {item.unit} for this plan.</p>}</details>}</div>
            <div className="grocery-quantity">{amount(item.status === 'covered' ? item.needed : item.shortage)} {item.unit || 'total'}<small>{item.status === 'covered' ? 'Covered for this plan' : item.covered > 0 ? `${amount(item.covered)} ${item.unit} from pantry` : 'Need to buy'}</small></div>
            <div className="shopping-actions"><label><input type="checkbox" aria-label={`Already have enough ${item.name} ${item.unit} for this plan`} checked={item.status === 'covered'} onChange={e => setHave(item, e.target.checked)} /> Already have</label><label><input type="checkbox" aria-label={`Bought ${item.name} ${item.unit}`} checked={bought.includes(item.id)} onChange={e => markBought(item.id, e.target.checked)} /> Bought</label></div>
          </article>)}</div>)}</div></section>)}
          {bought.length > 0 && <details className="completed-shopping"><summary>{groceries.filter(item => bought.includes(item.id)).length} items bought</summary><p>Shopping progress only. Inventory stays unchanged.</p>{groceries.filter(item => bought.includes(item.id)).map(item => <p key={item.id}>{item.name} · {item.unit}<button className="text-button" onClick={() => markBought(item.id, false)}>Undo bought {item.name}</button></p>)}</details>}
          {needed.length + review.length > 0 && <details className="grocery-group shopping-json no-print"><summary>Export shopping list</summary><button className="button secondary compact" onClick={exportList}>Download readable list</button><details><summary>Advanced: Shopping list JSON</summary><div className="json-actions"><button className="button secondary compact" onClick={copyJson}>{copied ? 'Copied' : 'Copy JSON'}</button><button className="button secondary compact" onClick={downloadJson}>Download JSON</button></div><label className="json-option"><input type="checkbox" checked={storeBrand} onChange={e => setStoreBrand(e.target.checked)} /> Prefer store brand</label><textarea ref={jsonRef} readOnly aria-label="Shopping list JSON" value={shoppingJson} rows={12} onFocus={e => e.currentTarget.select()} /></details></details>}
        </section>}
        </fieldset>
      </main>
    </div>
    {undo && !modalOpen && <div className="undo-toast" role="status"><span>{undo.message}</span><button disabled={props.saving} onClick={() => { undo.restore(); setUndo(null); }}>Undo</button><button aria-label="Dismiss notification" onClick={() => setUndo(null)}>×</button></div>}
    {picker && <div className="modal-backdrop no-print" onMouseDown={e => { if (e.target === e.currentTarget) setPicker(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="picker-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') setPicker(false); }}><div className="section-heading"><h2 id="picker-title">{replacing ? `Replace ${selected.find(item => item.meal.id === replacing)?.recipe.name ?? 'meal'}` : `Add ${mealType}`}</h2><button className="close-button" aria-label="Close recipe picker" onClick={() => setPicker(false)}>×</button></div><input className="search-input" autoFocus placeholder="Search recipes or ingredients" aria-label="Search recipes" value={search} onChange={e => setSearch(e.target.value)} /><label className="picker-sort">Sort recipes <select aria-label="Sort recipes" value={pickerMode} onChange={e => setPickerMode(e.target.value as 'pantry' | 'all')}><option value="all">Library order</option><option value="pantry" disabled={!suggestions.length}>Fewest missing ingredients</option></select></label>{pickerMode === 'pantry' && <><p className="picker-hint">Based on your tags. Check quantities and any protein add-ons before cooking; the grocery list checks the whole week.</p><label className="suggestion-filter">Show <select value={suggestionFilter} onChange={e => setSuggestionFilter(e.target.value as SuggestionGroup | 'all')}><option value="all">All matches</option>{(Object.entries(suggestionGroupLabel) as [SuggestionGroup, string][]).map(([key, label]) => <option value={key} key={key}>{label} ({suggestions.filter(s => s.group === key).length})</option>)}</select></label></>}<label><input type="checkbox" checked={readyOnly} onChange={e => setReadyOnly(e.target.checked)} /> Show meals ready to cook · quantities verified for {pickerServings} servings</label><p role="status">{pickerResults.length} search results</p>{!pickerResults.length && <div className="empty-state"><p>{search.trim() ? `No recipes match “${search}”.` : 'No recipes match these filters.'}</p><button className="button secondary compact" onClick={() => { setSearch(''); setReadyOnly(false); setSuggestionFilter('all'); setPickerMode('all'); }}>Clear search and filters</button></div>}<div className="recipe-results">{pickerMode === 'pantry' && suggestionFilter !== 'all' && !suggestions.some(s => s.group === suggestionFilter) && <p className="empty-state">No recipes in this group yet. Try all matches or add more kitchen items.</p>}{pickerResults.map(item => { const r = item.recipe; const sg = 'coverage' in item ? item : undefined; return <article key={r.id}><div><small>{r.bucketLabel} · {r.time} min{sg && <> · <span className="match-have">{suggestionGroupLabel[sg.group]} · {matchLabel(sg)}</span></>}</small><h3>{r.name}</h3><p>{sg ? missingLabel(sg) : r.description}</p></div><button className="button secondary compact" onClick={() => addRecipe(r)}>{replacing ? 'Replace meal' : '+ Add'}</button></article>; })}</div></section></div>}
    {detail && (() => { const planned = selected.find(item => item.meal.id === detailMealId);
      const servings = planned?.meal.servings ?? detailServings;
      const proteinIndex = planned ? planned.meal.proteinIndex : detailProtein;
      const scale = detail.recipe ? servings / detail.recipe.servings : 1;
      const protein = proteinIndex === undefined ? undefined : detail.recipe?.proteins?.[proteinIndex];
      const image = recipeImage(detail.id); const favorite = !!props.favorites?.includes(detail.id); return <div className="modal-backdrop no-print" onMouseDown={e => { if (e.target === e.currentTarget) setDetail(null); }}><section className="modal recipe-detail" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') setDetail(null); }}>
      <div className="section-heading"><h2 id="detail-title">{detail.name}</h2><div className="detail-actions">{detail.recipe && props.onToggleFavorite && <button className="favorite-button" aria-pressed={favorite} aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'} onClick={() => props.onToggleFavorite?.(detail.id)}><Heart filled={favorite} /></button>}<button autoFocus className="close-button" aria-label="Close recipe" onClick={() => setDetail(null)}>×</button></div></div>
      {image && <figure className="detail-photo"><img src={image.url} alt="" /><figcaption>Photo of a similar dish: <a href={image.sourceUrl} target="_blank" rel="noreferrer">{image.author}, {image.license}, Wikimedia Commons</a></figcaption></figure>}
      <p>{detail.recipe ? `${detail.recipe.time} min · Serves ${servings}` : detail.facts.join(' · ')}</p>
      {detail.recipe && <div className="detail-quantities"><label>Servings <select aria-label="Recipe servings" value={servings} onChange={e => planned ? updateMeal(planned.meal.id, { servings: Number(e.target.value) }) : setDetailServings(Number(e.target.value))}>{Array.from({ length: 24 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
        {!!detail.recipe.proteins?.length && <label>Add protein optional <select aria-label="Recipe protein add-on" value={proteinIndex ?? ''} onChange={e => { const value = e.target.value === '' ? undefined : Number(e.target.value); if (planned) updateMeal(planned.meal.id, { proteinIndex: value }); else setDetailProtein(value); }}><option value="">No extra protein</option>{detail.recipe.proteins.map((item, index) => <option key={index} value={index}>{item.name}</option>)}</select></label>}</div>}
      {detail.description && <p>{detail.description}</p>}
      <h3>Ingredients</h3><ul>{detail.ingredients.map(i => <li key={i.id}>{amount(i.amount === null ? null : i.amount * scale)} {i.unit} {i.name}</li>)}{protein && <li>{scaledProteinAmount(protein.amount, scale)} {protein.name}</li>}</ul>
      <h3>Method</h3>{detail.recipe && scale !== 1 && <p className="quantity-note">Ingredients above use {servings} servings. Amounts mentioned in these original method steps and protein instructions are for {detail.recipe.servings} servings; multiply ingredient amounts by {amount(scale)}. Keep cooking temperatures unchanged and check doneness.</p>}{protein && <p>{protein.instructions}</p>}<ol>{detail.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
      {(!detail.recipe ? detail.sections : []).map(group => <div key={group.title}><h3>{group.title}</h3><ul>{group.lines.map((line, i) => <li key={i}>{line}</li>)}</ul></div>)}
    </section></div>; })()}
    {resetConfirm && <div className="modal-backdrop no-print"><section className="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><h2 id="reset-title">Reset sample data?</h2><p>This replaces the plan and pantry saved in this browser with the sample data.</p><div className="bottom-action"><button autoFocus className="button secondary" onClick={() => setResetConfirm(false)}>Cancel</button><button className="button primary" onClick={() => { setState(createSamplePlanner()); setResetConfirm(false); }}>Reset</button></div></section></div>}
    <RecipeSheet ref={sheetRef} weekLabel={dateLabel} meals={selected} sides={sheetSides} />
    <div className="print-only"><h1>wmp</h1><p>Week of {dateLabel} · {selected.length} meals</p><h2>Shopping list</h2>{groceries.filter(i => i.status !== 'covered').map(i => <p key={i.id}>□ {i.name} — {amount(i.shortage)} {i.shortage !== null && i.unit}{i.status === 'review' ? ` · CHECK: ${i.reasons.join(' ')}` : ''}</p>)}{covered.length > 0 && <p>In pantry: {covered.map(i => i.name).join(', ')}</p>}{selected.map(({ meal, recipe }) => <section className="print-recipe" key={meal.id}><h2>{recipe.name}</h2><p>{recipe.time} minutes · {meal.servings} servings</p><ul>{recipe.ingredients.map(i => <li key={i.id}>{amount(i.amount === null ? null : i.amount * meal.servings / recipe.servings)} {i.unit} {i.name}</li>)}</ul>{meal.proteinIndex !== undefined && recipe.proteins?.[meal.proteinIndex] && <p><strong>Protein:</strong> {recipe.proteins[meal.proteinIndex].name} · Base recipe amount: {recipe.proteins[meal.proteinIndex].amount}. Scale by {amount(meal.servings / recipe.servings)}×. {recipe.proteins[meal.proteinIndex].instructions}</p>}<p className="quantity-note">Method ingredient amounts are for the original {recipe.servings} servings; multiply by {amount(meal.servings / recipe.servings)} for this meal. Keep temperatures unchanged and check doneness.</p><ol>{recipe.steps.map((step, i) => <li key={i}>{step}</li>)}</ol></section>)}</div>
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
