// Phase 9 throwaway prototype: two BuildPanels side by side, click to focus.
// Seeds each slot from the lorebook index on mount and exposes a picker on
// both sides so either slot can be swapped mid-session.
import { useEffect }        from 'react';
import { SideContext }      from '../../hooks/use-side.js';
import { useLorebookStore } from '../../state/lorebook-store.js';
import { BuildPanel }       from './BuildPanel.jsx';

function SlotPicker({ slotId, onChange }) {
  const lorebookIndex = useLorebookStore((s) => s.lorebookIndex);
  return (
    <select
      className="crosstalk-right-picker"
      value={slotId ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      onMouseDownCapture={(e) => e.stopPropagation()}
    >
      <option value="">(none)</option>
      {lorebookIndex.map((item) => (
        <option key={item.id} value={item.id}>{item.name || '(untitled)'}</option>
      ))}
    </select>
  );
}

function SideLabel({ name, active, slotId, onSlotChange }) {
  return (
    <div className="crosstalk-side-label">
      <span className={`crosstalk-side-title${active ? ' crosstalk-side-title--active' : ''}`}>
        {name || '(untitled)'}
      </span>
      <SlotPicker slotId={slotId} onChange={onSlotChange} />
    </div>
  );
}

export function CrosstalkPrototype() {
  const leftId        = useLorebookStore((s) => s.leftId);
  const rightId       = useLorebookStore((s) => s.rightId);
  const focusSide     = useLorebookStore((s) => s.focusSide);
  const lorebooks     = useLorebookStore((s) => s.lorebooks);
  const lorebookIndex = useLorebookStore((s) => s.lorebookIndex);
  const setSlot       = useLorebookStore((s) => s.setSlot);
  const setFocusSide  = useLorebookStore((s) => s.setFocusSide);

  const leftName  = leftId  ? lorebooks[leftId]?.name  ?? '' : '';
  const rightName = rightId ? lorebooks[rightId]?.name ?? '' : '';

  // Auto-seed slots once on mount from the two most-recent lorebooks.
  useEffect(() => {
    if (rightId) return;
    if (lorebookIndex.length >= 2) {
      setSlot('right', lorebookIndex[1].id);
    } else if (lorebookIndex.length === 1) {
      setSlot('right', lorebookIndex[0].id);
    }
  }, [rightId, lorebookIndex, setSlot]);

  function focusSide_(side) {
    // Keep the store's focusSide in sync so activeLorebookId (and therefore
    // undo/redo, which is called from outside any SideContext) targets the
    // correct lorebook.
    setFocusSide(side);
  }

  return (
    <div className="crosstalk-prototype">
      <div
        className={`crosstalk-side${focusSide === 'left' ? ' crosstalk-side--focused' : ' crosstalk-side--dimmed'}`}
        onMouseDownCapture={() => focusSide_('left')}
      >
        <SideContext.Provider value="left">
          <SideLabel
            name={leftName}
            active={focusSide === 'left'}
            slotId={leftId}
            onSlotChange={(id) => setSlot('left', id)}
          />
          <BuildPanel />
        </SideContext.Provider>
      </div>

      <div className="crosstalk-divider" />

      <div
        className={`crosstalk-side${focusSide === 'right' ? ' crosstalk-side--focused' : ' crosstalk-side--dimmed'}`}
        onMouseDownCapture={() => focusSide_('right')}
      >
        <SideContext.Provider value="right">
          <SideLabel
            name={rightName}
            active={focusSide === 'right'}
            slotId={rightId}
            onSlotChange={(id) => setSlot('right', id)}
          />
          <BuildPanel />
        </SideContext.Provider>
      </div>
    </div>
  );
}
