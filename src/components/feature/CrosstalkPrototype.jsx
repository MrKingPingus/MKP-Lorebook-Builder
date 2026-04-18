// Phase 9 throwaway prototype: two BuildPanels side by side, click to focus.
// Step 2+ seeds rightId from the second-most-recent lorebook (or leftId when
// only one exists) and offers a picker in the right label strip so we can
// swap the right-side target without touching code. Until side-aware hooks
// land in step 3 both BuildPanels still render the active (left) lorebook.
import { useEffect, useState } from 'react';
import { SideContext }         from '../../hooks/use-side.js';
import { useLorebookStore }    from '../../state/lorebook-store.js';
import { BuildPanel }          from './BuildPanel.jsx';

function SideLabel({ name, active, children }) {
  return (
    <div className="crosstalk-side-label">
      <span className={`crosstalk-side-title${active ? ' crosstalk-side-title--active' : ''}`}>
        {name || '(untitled)'}
      </span>
      {children}
    </div>
  );
}

function RightPicker({ rightId, onChange }) {
  const lorebookIndex = useLorebookStore((s) => s.lorebookIndex);
  return (
    <select
      className="crosstalk-right-picker"
      value={rightId ?? ''}
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

export function CrosstalkPrototype() {
  const [focusedSide, setFocusedSide] = useState('left');
  const leftId        = useLorebookStore((s) => s.leftId);
  const rightId       = useLorebookStore((s) => s.rightId);
  const lorebooks     = useLorebookStore((s) => s.lorebooks);
  const lorebookIndex = useLorebookStore((s) => s.lorebookIndex);
  const setSlot       = useLorebookStore((s) => s.setSlot);

  const leftName  = leftId  ? lorebooks[leftId]?.name  ?? '' : '';
  const rightName = rightId ? lorebooks[rightId]?.name ?? '' : '';

  // Auto-seed rightId once: prefer the second-most-recent lorebook, fall
  // back to leftId so single-lorebook testing still renders something.
  useEffect(() => {
    if (rightId) return;
    if (lorebookIndex.length >= 2) {
      setSlot('right', lorebookIndex[1].id);
    } else if (lorebookIndex.length === 1) {
      setSlot('right', lorebookIndex[0].id);
    }
  }, [rightId, lorebookIndex, setSlot]);

  return (
    <div className="crosstalk-prototype">
      <div
        className={`crosstalk-side${focusedSide === 'left' ? ' crosstalk-side--focused' : ' crosstalk-side--dimmed'}`}
        onMouseDownCapture={() => setFocusedSide('left')}
      >
        <SideContext.Provider value="left">
          <SideLabel name={leftName} active={focusedSide === 'left'} />
          <BuildPanel />
        </SideContext.Provider>
      </div>

      <div className="crosstalk-divider" />

      <div
        className={`crosstalk-side${focusedSide === 'right' ? ' crosstalk-side--focused' : ' crosstalk-side--dimmed'}`}
        onMouseDownCapture={() => setFocusedSide('right')}
      >
        <SideContext.Provider value="right">
          <SideLabel name={rightName} active={focusedSide === 'right'}>
            <RightPicker rightId={rightId} onChange={(id) => setSlot('right', id)} />
          </SideLabel>
          <BuildPanel />
        </SideContext.Provider>
      </div>
    </div>
  );
}
