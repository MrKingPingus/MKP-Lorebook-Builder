// Entry type dropdown with Shift+scroll cycling between defined entry types
import { ENTRY_TYPES } from '../../constants/entry-types.js';
import { CyclingSelect } from '../ui/CyclingSelect.jsx';

export function TypeSelector({ value, onChange }) {
  return (
    <CyclingSelect
      className="type-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {ENTRY_TYPES.map((t) => (
        <option key={t.id} value={t.id}>{t.label}</option>
      ))}
    </CyclingSelect>
  );
}
