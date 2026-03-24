// Filter bar: FILTER label, All pill, type pills, shift-click hint, Group by type + Expand All
import { ENTRY_TYPES }  from '../../constants/entry-types.js';
import { useTypeFilter } from '../../hooks/use-type-filter.js';
import { useUiStore }    from '../../state/ui-store.js';

export function TypeFilterBar({ entries }) {
  const { typeFilter, toggleTypeFilter, clearFilter } = useTypeFilter(entries);
  const expandAll      = useUiStore((s) => s.expandAll);
  const groupByType    = useUiStore((s) => s.groupByType);
  const setExpandAll   = useUiStore((s) => s.setExpandAll);
  const setCollapseAll = useUiStore((s) => s.setCollapseAll);
  const setGroupByType = useUiStore((s) => s.setGroupByType);

  function handleTypeClick(e, typeId) {
    if (e.shiftKey) {
      // Shift+click: toggle this type in addition to existing selection
      toggleTypeFilter(typeId);
    } else {
      // Normal click: if only this type active, clear; else set only this type
      if (typeFilter.length === 1 && typeFilter[0] === typeId) {
        clearFilter();
      } else {
        const { setTypeFilter } = useUiStore.getState();
        setTypeFilter([typeId]);
      }
    }
  }

  function handleExpandCollapseClick() {
    if (expandAll) {
      // Currently expanded — collapse all
      setExpandAll(false);
      setCollapseAll(true);
    } else {
      // Currently collapsed — expand all
      setExpandAll(true);
      setCollapseAll(false);
    }
  }

  return (
    <div className="type-filter-bar">
      <span className="filter-label">FILTER:</span>

      {/* All pill */}
      <button
        className={`type-pill${typeFilter.length === 0 ? ' type-pill--active' : ''}`}
        onClick={clearFilter}
      >
        All
      </button>

      {/* Per-type pills */}
      {ENTRY_TYPES.map((t) => {
        const active = typeFilter.includes(t.id);
        return (
          <button
            key={t.id}
            className={`type-pill${active ? ' type-pill--active' : ''}`}
            style={active ? { borderColor: t.color, color: t.color, background: `${t.color}1a` } : {}}
            onClick={(e) => handleTypeClick(e, t.id)}
            title="Shift+click for multi-select"
          >
            {t.label}
          </button>
        );
      })}

      <span className="filter-hint">Shift+click for multi</span>

      <div className="filter-right">
        <button
          className={`filter-action-btn${groupByType ? ' filter-action-btn--active' : ''}`}
          onClick={() => setGroupByType(!groupByType)}
        >
          Group by type
        </button>
        <button
          className={`filter-action-btn${expandAll ? ' filter-action-btn--active' : ''}`}
          onClick={handleExpandCollapseClick}
        >
          {expandAll ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
    </div>
  );
}
