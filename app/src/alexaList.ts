import type { ShoppingListItem } from './shoppingList.ts';

// Alexa accepts 500 characters per request. Stay under that so differences in how a
// newline is counted never push a part over the limit.
export const ALEXA_LIMIT = 480;
export const STORE_BRAND_HEADER = 'Prefer store brand.';

export interface AlexaOptions { preferStoreBrand?: boolean; limit?: number }

// One plain line per item: "2 limes", or just the name when buying one.
export function alexaLine(item: ShoppingListItem): string {
  return item.quantity > 1 ? `${item.quantity} ${item.item}` : item.item;
}

// Splits the list into parts that each fit the limit, never splitting an item across
// parts. The store-brand preference is stated once at the top of every part, because
// each part is pasted as its own request.
export function buildAlexaParts(items: ShoppingListItem[], options: AlexaOptions = {}): string[] {
  const limit = options.limit ?? ALEXA_LIMIT;
  const header = options.preferStoreBrand ? STORE_BRAND_HEADER : '';
  const room = limit - (header ? header.length + 1 : 0);
  const parts: string[][] = [];
  let current: string[] = [];
  let length = 0;
  for (const raw of items.map(alexaLine)) {
    // A single unusually long name is shortened so it still fits on its own.
    const line = raw.length > room ? `${raw.slice(0, room - 1).trimEnd()}…` : raw;
    if (current.length && length + 1 + line.length > room) { parts.push(current); current = []; length = 0; }
    length += current.length ? 1 + line.length : line.length;
    current.push(line);
  }
  if (current.length) parts.push(current);
  return parts.map(lines => (header ? [header, ...lines] : lines).join('\n'));
}
