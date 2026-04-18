// Phase 9 throwaway prototype: two BuildPanels side by side, click to focus.
// Both panels currently render the same active lorebook — this surfaces the
// duplicate-mount and shared-state issues we need to design around before
// introducing a real dual-lorebook store.
import { useState }   from 'react';
import { useLorebook } from '../../hooks/use-lorebook.js';
import { BuildPanel } from './BuildPanel.jsx';

function SideLabel({ name, active }) {
  return (
    <div className="crosstalk-side-label">
      <span className={`crosstalk-side-title${active ? ' crosstalk-side-title--active' : ''}`}>
        {name || '(untitled)'}
      </span>
    </div>
  );
}

export function CrosstalkPrototype() {
  const [focusedSide, setFocusedSide] = useState('left');
  const { activeLorebook } = useLorebook();
  const name = activeLorebook?.name ?? '';

  return (
    <div className="crosstalk-prototype">
      <div
        className={`crosstalk-side${focusedSide === 'left' ? ' crosstalk-side--focused' : ' crosstalk-side--dimmed'}`}
        onMouseDownCapture={() => setFocusedSide('left')}
      >
        <SideLabel name={name} active={focusedSide === 'left'} />
        <BuildPanel />
      </div>

      <div className="crosstalk-divider" />

      <div
        className={`crosstalk-side${focusedSide === 'right' ? ' crosstalk-side--focused' : ' crosstalk-side--dimmed'}`}
        onMouseDownCapture={() => setFocusedSide('right')}
      >
        <SideLabel name={name} active={focusedSide === 'right'} />
        <BuildPanel />
      </div>
    </div>
  );
}

