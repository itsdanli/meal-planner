import { useState } from 'react';
import SelectionTabs from './SelectionTabs';
import { cocktails, mealEntry, recipeImage, smokerRecipes, smoothies, type LibraryEntry } from './library';
import type { Recipe } from './types';
import { withoutDisliked } from './preferences';

type Section = 'breakfast' | 'lunch' | 'dinners' | 'favorites' | 'cocktails' | 'smoker' | 'smoothies' | 'hidden';
interface Props {
  recipes: Recipe[];
  plannedIds: string[];
  favorites?: string[];
  disliked?: string[];
  onSetDisliked?: (id: string, disliked: boolean) => void;
  onToggleFavorite?: (id: string) => void;
  onOpen: (entry: LibraryEntry) => void;
  onAdd: (recipe: Recipe) => void;
  onPlanFavorites: (recipes: Recipe[]) => void;
}

export const Heart = ({ filled }: { filled: boolean }) => <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" /></svg>;

export default function RecipeBrowser({ recipes, disliked, onSetDisliked, plannedIds, favorites, onToggleFavorite, onOpen, onAdd, onPlanFavorites }: Props) {
  const [picked, setSection] = useState<Section>('dinners');
  const [search, setSearch] = useState('');
  const canFavorite = !!onToggleFavorite;
  const hiddenIds = disliked ?? [];
  const hiddenRecipes = recipes.filter(r => hiddenIds.includes(r.id));
  const visible = withoutDisliked(recipes, hiddenIds);
  const favoriteRecipes = visible.filter(r => favorites?.includes(r.id));
  const sections: [Section, string, LibraryEntry[]][] = [
    ['breakfast', 'Breakfast', visible.filter(r => r.mealType === 'breakfast').map(mealEntry)],
    ['lunch', 'Lunch', visible.filter(r => r.mealType === 'lunch').map(mealEntry)],
    ['dinners', 'Dinner', visible.filter(r => !r.mealType || r.mealType === 'dinner').map(mealEntry)],
    ...(canFavorite ? [['favorites', 'Favorites', favoriteRecipes.map(mealEntry)] as [Section, string, LibraryEntry[]]] : []),
    ['cocktails', 'Cocktails', cocktails], ['smoker', 'Smoker', smokerRecipes], ['smoothies', 'Smoothies', smoothies],
    ...(onSetDisliked && hiddenRecipes.length ? [['hidden', 'Hidden', hiddenRecipes.map(mealEntry)] as [Section, string, LibraryEntry[]]] : []),
  ];
  const section: Section = sections.some(([key]) => key === picked) ? picked : 'dinners';
  const entries = sections.find(([key]) => key === section)?.[2] ?? [];
  const shown = entries.filter(e => `${e.name} ${e.label} ${e.ingredients.map(i => i.name).join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <section>
    <div className="library-bar">
      <SelectionTabs label="Recipe type" panelId="library-results" value={section} onChange={setSection} options={sections.map(([key, label, list]) => [key, `${label} · ${list.length}`] as const)} />
      <input className="search-input" placeholder="Search recipes or ingredients" aria-label="Search recipes" value={search} onChange={e => setSearch(e.target.value)} />
    </div>
    {section === 'favorites' && (favoriteRecipes.length
      ? <div className="favorites-plan"><p className="section-note">Replaces this week’s meals with up to 3 of your favorites, picked at random.</p><button className="button primary compact" onClick={() => onPlanFavorites(favoriteRecipes)}>Plan week from favorites</button></div>
      : <p className="empty-state">No favorites yet. Use the heart on a recipe to add it here.</p>)}
    {section === 'hidden' && <p className="section-note">These recipes won’t be suggested, randomized or planned from favorites. Show one again to bring it back.</p>}
    {['cocktails', 'smoker', 'smoothies'].includes(section) && <p className="section-note">For browsing only. These are not added to the week or the grocery list.</p>}
    {!canFavorite && ['breakfast', 'lunch', 'dinners'].includes(section) && <p className="section-note">Sign in to save favorites.</p>}
    <div className="library-grid" id="library-results" role="tabpanel" aria-label={`${section} recipes`}>{shown.map(entry => { const image = recipeImage(entry.id); const favorite = !!favorites?.includes(entry.id); const planned = plannedIds.includes(entry.id); return <article className="library-card" key={entry.id}>
      <button className="library-photo" onClick={() => onOpen(entry)} aria-label={`Open ${entry.name}`}>{image && <img src={image.url} alt="" loading="lazy" />}</button>
      <div className="library-body">
        <small>{entry.label} · {entry.facts[0]}</small>
        <button className="recipe-title" onClick={() => onOpen(entry)}>{entry.name}</button>
        <p>{entry.description}</p>
        {entry.recipe && section === 'hidden' ? <div className="library-actions"><button className="button secondary compact" onClick={() => onSetDisliked?.(entry.id, false)}>Show again</button></div> : entry.recipe && <div className="library-actions">
          <button className="button secondary compact" disabled={planned} onClick={() => onAdd(entry.recipe!)}>{planned ? 'In this week' : '+ Add to week'}</button>
          {canFavorite && <button className="favorite-button" aria-pressed={favorite} aria-label={`${favorite ? 'Remove' : 'Add'} ${entry.name} ${favorite ? 'from' : 'to'} favorites`} onClick={() => onToggleFavorite(entry.id)}><Heart filled={favorite} /></button>}
        </div>}
      </div>
    </article>; })}</div>
    {!shown.length && entries.length > 0 && <div className="empty-state"><p>No recipes match “{search}”.</p><button className="button secondary compact" onClick={() => setSearch('')}>Clear search</button></div>}
  </section>;
}
