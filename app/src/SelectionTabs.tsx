import { useId } from 'react';

export default function SelectionTabs<T extends string>({ label, value, options, onChange, panelId }: {
  label: string; panelId: string; value: T; options: readonly (readonly [T, string])[]; onChange: (value: T) => void;
}) {
  const id = useId();
  return <div className="picker-modes" role="tablist" aria-label={label}>{options.map(([key, title], index) => <button
    key={key} id={`${id}-${key}`} role="tab" aria-controls={panelId} aria-selected={value === key} tabIndex={value === key ? 0 : -1}
    onClick={() => onChange(key)} onKeyDown={event => {
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
        : event.key === 'ArrowRight' ? (index + 1) % options.length : event.key === 'ArrowLeft' ? (index + options.length - 1) % options.length : -1;
      if (next < 0) return;
      event.preventDefault(); onChange(options[next][0]);
      document.getElementById(`${id}-${options[next][0]}`)?.focus();
    }}>{title}</button>)}</div>;
}
