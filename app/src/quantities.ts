// Fractions are display-only; grocery arithmetic always uses the original values.
export function formatAmount(value: number | null): string {
  if (value === null) return 'As needed';
  const whole = Math.floor(value);
  const fraction = value - whole;
  const fractions: [number, string][] = [[0.125, '⅛'], [0.25, '¼'], [0.375, '⅜'], [0.625, '⅝'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [0.875, '⅞']];
  const match = fractions.find(([number]) => Math.abs(number - fraction) < 0.005);
  return match ? `${whole || ''}${match[1]}` : Number(value.toFixed(2)).toString();
}

export function scaledProteinAmount(text: string, scale: number): string {
  const match = text.trim().match(/^(\d+(?:\.\d+)?|\d+\/\d+|\d+ \d+\/\d+)\s*([a-zA-Z ]*)$/);
  if (!match || !/^(?:g|kg|oz|lb|lbs|pounds?|grams?|kilograms?|ounces?|each|cans?|blocks?|fillets?|pieces?|links?|chops?)?$/.test(match[2].trim().toLowerCase())) return scale === 1 ? text : `${text} (original amount; multiply by ${formatAmount(scale)} for your servings)`;
  const quantity = match[1].split(' ').reduce((sum, part) => {
    const [n, d] = part.split('/').map(Number);
    return sum + (d === undefined ? n : n / d);
  }, 0);
  return `${formatAmount(quantity * scale)} ${match[2].trim()}`.trim();
}
