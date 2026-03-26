// Entry type dropdown with scroll-wheel cycling between defined entry types
import { ENTRY_TYPES } from '../../constants/entry-types.js';

export function TypeSelector({ value, onChange }) {
  function onWheel(e) {
    if (!e.shiftKey) return;
    e.preventDefault();
    const idx  = ENTRY_TYPES.findIndex((t) => t.id === value);
    const next = (idx + (e.deltaY > 0 ? 1 : -1) + ENTRY_TYPES.length) % ENTRY_TYPES.length;
    onChange(ENTRY_TYPES[next].id);
  }

  return (
    <select
      className="type-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onWheel={onWheel}
    >
      {ENTRY_TYPES.map((t) => (
        <option key={t.id} value={t.id}>{t.label}</option>
      ))}
    </select>
  );
}
