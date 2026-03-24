// Pill button row to show/hide entries by type — wired to use-type-filter
import { ENTRY_TYPES } from '../../constants/entry-types.js';
import { useTypeFilter } from '../../hooks/use-type-filter.js';

export function TypeFilterBar({ entries }) {
  const { typeFilter, toggleTypeFilter, clearFilter } = useTypeFilter(entries);

  return (
    <div className="type-filter-bar">
      {ENTRY_TYPES.map((t) => {
        const active = typeFilter.includes(t.id);
        return (
          <button
            key={t.id}
            className={`type-filter-pill${active ? ' type-filter-pill--active' : ''}`}
            style={active ? { borderColor: t.color, color: t.color } : {}}
            onClick={() => toggleTypeFilter(t.id)}
          >
            {t.label}
          </button>
        );
      })}
      {typeFilter.length > 0 && (
        <button className="type-filter-clear" onClick={clearFilter}>All</button>
      )}
    </div>
  );
}
