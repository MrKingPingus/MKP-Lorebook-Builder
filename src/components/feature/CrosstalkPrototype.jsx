// Phase 9 throwaway prototype: two BuildPanels side by side, click to focus.
// Seeds each slot from the lorebook index on mount and exposes a picker on
// both sides so either slot can be swapped mid-session.
import { useEffect, useRef }   from 'react';
import { SideContext }         from '../../hooks/use-side.js';
import { useCrosstalkSlots }   from '../../hooks/use-crosstalk-slots.js';
import { BuildPanel }          from './BuildPanel.jsx';

function SlotPicker({ slotId, onChange, lorebookIndex }) {
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

function SideLabel({ name, active, slotId, onSlotChange, lorebookIndex }) {
  return (
    <div className="crosstalk-side-label">
      <span className={`crosstalk-side-title${active ? ' crosstalk-side-title--active' : ''}`}>
        {name || '(untitled)'}
      </span>
      <SlotPicker slotId={slotId} onChange={onSlotChange} lorebookIndex={lorebookIndex} />
    </div>
  );
}

export function CrosstalkPrototype() {
  const {
    leftId, rightId, focusSide,
    leftName, rightName,
    lorebookIndex,
    setSlot, pickSlot, setFocusSide,
  } = useCrosstalkSlots();

  // Seed the right slot once on first mount (after bootstrap loads the index).
  // One-shot: if the user later clears the slot via "(none)", we don't
  // auto-re-seed (that would override intentional empty-slot selection).
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (rightId) { seededRef.current = true; return; }
    if (lorebookIndex.length >= 2) {
      setSlot('right', lorebookIndex[1].id);
      seededRef.current = true;
    } else if (lorebookIndex.length === 1) {
      setSlot('right', lorebookIndex[0].id);
      seededRef.current = true;
    }
  }, [rightId, lorebookIndex, setSlot]);

  return (
    <div className="crosstalk-prototype">
      <div
        className={`crosstalk-side${focusSide === 'left' ? ' crosstalk-side--focused' : ' crosstalk-side--dimmed'}`}
        onMouseDownCapture={() => setFocusSide('left')}
      >
        <SideContext.Provider value="left">
          <SideLabel
            name={leftName}
            active={focusSide === 'left'}
            slotId={leftId}
            onSlotChange={(id) => pickSlot('left', id)}
            lorebookIndex={lorebookIndex}
          />
          <BuildPanel />
        </SideContext.Provider>
      </div>

      <div className="crosstalk-divider" />

      <div
        className={`crosstalk-side${focusSide === 'right' ? ' crosstalk-side--focused' : ' crosstalk-side--dimmed'}`}
        onMouseDownCapture={() => setFocusSide('right')}
      >
        <SideContext.Provider value="right">
          <SideLabel
            name={rightName}
            active={focusSide === 'right'}
            slotId={rightId}
            onSlotChange={(id) => pickSlot('right', id)}
            lorebookIndex={lorebookIndex}
          />
          <BuildPanel />
        </SideContext.Provider>
      </div>
    </div>
  );
}
