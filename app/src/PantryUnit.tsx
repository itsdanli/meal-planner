import { useState } from 'react';

export default function PantryUnit({ name, value, suggestions, onChange }: {
  name: string; value: string; suggestions: string[]; onChange: (unit: string) => void;
}) {
  const [custom, setCustom] = useState(false);
  const options = [...new Set(suggestions.filter(Boolean))];
  const isCustom = custom || (!!value && !options.includes(value));
  return <label>Unit <select aria-label={`Unit for ${name}`} value={isCustom ? '__custom' : value} onChange={e => {
    if (e.target.value === '__custom') setCustom(true);
    else { setCustom(false); onChange(e.target.value); }
  }}><option value="">Choose unit</option>{options.map(unit => <option key={unit} value={unit}>{unit}</option>)}<option value="__custom">Custom unit…</option></select>
    {isCustom && <input aria-label={`Custom unit for ${name}`} placeholder="Type a unit" value={value} onChange={e => onChange(e.target.value)} />}
  </label>;
}
