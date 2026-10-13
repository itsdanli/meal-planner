import type { GroceryItem } from './types.ts';

export interface ShoppingListItem { item: string; quantity: number; note?: string }
export interface ShoppingListOptions { preferStoreBrand?: boolean }

// Units that are bought one-for-one; an empty unit is a plain count. Weights, volumes and
// parts of a package (cloves, sheets) become one package with the needed amount as a note.
const wholeUnits = new Set(['', 'can', 'packet', 'bag', 'block', 'bunch', 'tub']);

// Structured export for a separate shopping agent. Pantry-covered items are left out.
export function buildShoppingList(groceries: GroceryItem[], options: ShoppingListOptions = {}): ShoppingListItem[] {
  return groceries.filter(item => item.status !== 'covered').map(item => {
    const notes: string[] = [];
    let quantity = 1;
    if (item.shortage) {
      if (wholeUnits.has(item.unit)) quantity = Math.ceil(item.shortage);
      else notes.push(`need about ${Number(item.shortage.toFixed(2))} ${item.unit}`);
    }
    if (item.status === 'review') notes.push(`check before buying: ${item.reasons.join(' ') || 'confirm the amount needed'}`);
    if (options.preferStoreBrand) notes.push('store brand preferred');
    return { item: item.name, quantity, ...(notes.length ? { note: notes.join('; ') } : {}) };
  });
}

// One item per line, matching the format the shopping assistant expects.
export function formatShoppingList(items: ShoppingListItem[]): string {
  const line = (item: ShoppingListItem) => `  {"item": ${JSON.stringify(item.item)}, "quantity": ${item.quantity}${item.note ? `, "note": ${JSON.stringify(item.note)}` : ''}}`;
  return items.length ? `[\n${items.map(line).join(',\n')}\n]` : '[]';
}
