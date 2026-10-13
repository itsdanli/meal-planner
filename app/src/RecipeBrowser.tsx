import { useState } from 'react';
import { cocktails, dinnerEntry, recipeImage, smokerRecipes, smoothies, type LibraryEntry } from './library';
import type { Recipe } from './types';

type Section = 'dinners' | 'favorites' | 'cocktails' | 'smoker' | 'smoothies';
interface Props {
  recipes: Recipe[];
  plannedIds: string[];
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
  onOpen: (entry: LibraryEntry) => void;
  onAdd: (recipe: Recipe) => void;
  onPlanFavorites: (recipes: Recipe[]) => void;
}

export const Heart = ({ filled }: { filled: boolean }) => <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" /></svg>;

export default function RecipeBrowser({ recipes, plannedIds, favorites, onToggleFavorite, onOpen, onAdd, onPlanFavorites }: Props) {
  const [section, setSection] = useState<Section>('dinners');
  const [search, setSearch] = useState('');
  const canFavorite = !!onToggleFavorite;
  const favoriteRecipes = recipes.filter(r => favorites?.includes(r.id));
  const sections: [Section, string, LibraryEntry[]][] = [
    ['dinners', 'Dinners', recipes.map(dinnerEntry)],
    ...(canFavorite ? [['favorites', 'Favorites', favoriteRecipes.map(dinnerEntry)] as [Section, string, LibraryEntry[]]] : []),
    ['cocktails', 'Cocktails', cocktails], ['smoker', 'Smoker', smokerRecipes], ['smoothies', 'Smoothies', smoothies],
  ];
  const entries = sections.find(([key]) => key === section)?.[2] ?? [];
  const shown = entries.filter(e => `${e.name} ${e.label} ${e.ingredients.map(i => i.name).join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <section>
    <div className="library-bar">
      <div className="picker-modes" role="group" aria-label="Recipe type">{sections.map(([key, label, list]) => <button key={key} aria-pressed={section === key} onClick={() => setSection(key)}>{label} · {list.length}</button>)}</div>
      <input className="search-input" placeholder="Search recipes or ingredients" aria-label="Search recipes" value={search} onChange={e => setSearch(e.target.value)} />
    </div>
    {section === 'favorites' && (favoriteRecipes.length
      ? <div className="favorites-plan"><p className="section-note">Replaces this week’s meals with up to 3 of your favorites, picked at random.</p><button className="button primary compact" onClick={() => onPlanFavorites(favoriteRecipes)}>Plan week from favorites</button></div>
      : <p className="empty-state">No favorites yet. Use the heart on a dinner to add it here.</p>)}
    {section !== 'dinners' && section !== 'favorites' && <p className="section-note">For browsing only. These are not added to the week or the grocery list.</p>}
    {!canFavorite && section === 'dinners' && <p className="section-note">Sign in to save favorites.</p>}
    <div className="library-grid">{shown.map(entry => { const image = recipeImage(entry.id); const favorite = !!favorites?.includes(entry.id); const planned = plannedIds.includes(entry.id); return <article className="library-card" key={entry.id}>
      <button className="library-photo" onClick={() => onOpen(entry)} aria-label={`Open ${entry.name}`}>{image && <img src={image.url} alt="" loading="lazy" />}</button>
      <div className="library-body">
        <small>{entry.label} · {entry.facts[0]}</small>
        <button className="recipe-title" onClick={() => onOpen(entry)}>{entry.name}</button>
        <p>{entry.description}</p>
        {entry.recipe && <div className="library-actions">
          <button className="button secondary compact" disabled={planned} onClick={() => onAdd(entry.recipe!)}>{planned ? 'In this week' : '+ Add to week'}</button>
          {canFavorite && <button className="favorite-button" aria-pressed={favorite} aria-label={`${favorite ? 'Remove' : 'Add'} ${entry.name} ${favorite ? 'from' : 'to'} favorites`} onClick={() => onToggleFavorite(entry.id)}><Heart filled={favorite} /></button>}
        </div>}
      </div>
    </article>; })}</div>
    {!shown.length && entries.length > 0 && <p className="empty-state">No recipes match your search.</p>}
  </section>;
}
