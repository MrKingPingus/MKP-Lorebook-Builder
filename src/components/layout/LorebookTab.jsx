// Pull tab hanging off the OUTSIDE of the window's right edge, opening the
// Lorebooks side panel.
//
// The side panel is the one layout that leaves the entry list genuinely
// unobstructed — useMenuPanel widens the window by MENU_PANEL_WIDTH rather than
// taking space from the list, so nothing is covered. This gives that panel a
// direct, always-visible affordance instead of burying it behind a menu.
//
// Portaled to document.body because `.floating-window` sets `overflow: hidden`:
// a tab positioned past the frame's right edge from inside would just be clipped
// away. Earlier passes worked around that by keeping it inside the frame — first
// as an absolute overlay (which sat on entry rows and the scrollbar), then as a
// real flex column (which cost a 30px gutter inside the border). Neither is
// necessary; position it from the window's own rect and it can sit outside.
//
// No measurement or ResizeObserver needed: `windowPos` / `windowSize` are store
// state that use-drag-window writes on every pointermove, so subscribing here is
// enough for the tab to track the window live through drags and resizes.
import { createPortal } from 'react-dom';
import { useUi } from '../../hooks/use-ui.js';
import { LOREBOOK_TAB_WIDTH_PX } from '../../constants/limits.js';

export function LorebookTab() {
  const activeMenuPanel    = useUi((s) => s.activeMenuPanel);
  const setActiveMenuPanel = useUi((s) => s.setActiveMenuPanel);
  const windowPos          = useUi((s) => s.windowPos);
  const windowSize         = useUi((s) => s.windowSize);

  const open = activeMenuPanel === 'lorebooks';

  return createPortal(
    <button
      type="button"
      className={`lorebook-tab${open ? ' lorebook-tab--open' : ''}`}
      style={{
        // The 1px overlap tucks the tab's left edge under the window's border so
        // the two read as one object instead of two shapes touching.
        left:  windowPos.x + windowSize.width - 1,
        top:   windowPos.y + windowSize.height / 2,
        width: LOREBOOK_TAB_WIDTH_PX,
      }}
      onClick={() => setActiveMenuPanel(open ? null : 'lorebooks')}
      title={open ? 'Close the lorebook panel' : 'Open the lorebook panel'}
      aria-label={open ? 'Close the lorebook panel' : 'Open the lorebook panel'}
      aria-expanded={open}
    >
      <span className="lorebook-tab-inner">
        <span className="lorebook-tab-arrow" aria-hidden="true">{open ? '›' : '‹'}</span>
        <span className="lorebook-tab-label">LOREBOOKS</span>
      </span>
    </button>,
    document.body,
  );
}
