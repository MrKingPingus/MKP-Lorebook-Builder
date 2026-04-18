// Phase 9 throwaway prototype: two BuildPanels side by side, click to focus.
// Both panels currently render the same active lorebook — this surfaces the
// duplicate-mount and shared-state issues we need to design around before
// introducing a real dual-lorebook store.
import { useState }  from 'react';
import { BuildPanel } from './BuildPanel.jsx';

export function CrosstalkPrototype() {
  const [focusedSide, setFocusedSide] = useState('left');

  return (
    <div className="crosstalk-prototype">
      <div
        className={`crosstalk-side${focusedSide === 'left' ? '' : ' crosstalk-side--dimmed'}`}
        onMouseDownCapture={() => setFocusedSide('left')}
      >
        <div className="crosstalk-side-label">LEFT {focusedSide === 'left' && '· focused'}</div>
        <BuildPanel />
      </div>

      <div className="crosstalk-divider" />

      <div
        className={`crosstalk-side${focusedSide === 'right' ? '' : ' crosstalk-side--dimmed'}`}
        onMouseDownCapture={() => setFocusedSide('right')}
      >
        <div className="crosstalk-side-label">RIGHT {focusedSide === 'right' && '· focused'}</div>
        <BuildPanel />
      </div>
    </div>
  );
}
