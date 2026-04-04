// Filter bar: type pills, Group by type toggle (mobile inline), Expand All (desktop only)
import { ENTRY_TYPES }   from '../../constants/entry-types.js';
import { useTypeFilter } from '../../hooks/use-type-filter.js';
import { useUi }         from '../../hooks/use-ui.js';
import { useMobile }     from '../../hooks/use-mobile.js';

export function TypeFilterBar({ entries }) {
  const { typeFilter, toggleTypeFilter, clearFilter } = useTypeFilter(entries);
  const expandAll    = useUi((s) => s.expandAll);
  const collapseAll  = useUi((s) => s.collapseAll);
  const groupByType  = useUi((s) => s.groupByType);
  const setExpandAll   = useUi((s) => s.setExpandAll);
  const setCollapseAll = useUi((s) => s.setCollapseAll);
  const setGroupByType = useUi((s) => s.setGroupByType);
  const isMobile       = useMobile();

  function handleExpandAll() {
    setExpandAll(true);
    setCollapseAll(false);
  }

  function handleCollapseAll() {
    setCollapseAll(true);
    setExpandAll(false);
  }

  function handleTypeClick(e, typeId) {
    if (e.shiftKey) {
      toggleTypeFilter(typeId);
    } else {
      if (typeFilter.length === 1 && typeFilter[0] === typeId) {
        clearFilter();
      } else {
        const { setTypeFilter } = useUi.getState();
        setTypeFilter([typeId]);
      }
    }
  }

  return (
    <div className="type-filter-bar">
      {/* All pill */}
      <button
        className={`type-pill${typeFilter.length === 0 ? ' type-pill--active' : ''}`}
        onClick={clearFilter}
        title="Shift+click for multi-select"
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

      {/* Group by type — inline pill on mobile; desktop keeps it in the filter row too */}
      <button
        className={`type-pill type-pill--dashed${groupByType ? ' type-pill--dashed-active' : ''}`}
        onClick={() => setGroupByType(!groupByType)}
      >
        Group by type
      </button>

      {/* Expand All / Collapse All — desktop only (mobile uses slide-in detail panel) */}
      {!isMobile && (
        <button
          className="filter-action-btn"
          onClick={expandAll ? handleCollapseAll : handleExpandAll}
        >
          {expandAll ? 'Collapse All' : 'Expand All'}
        </button>
      )}
    </div>
  );
}
