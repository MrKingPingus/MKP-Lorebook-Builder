// Pull tab forming the window's right edge, opening the Lorebooks side panel.
//
// The side panel is the one layout that leaves the entry list genuinely
// unobstructed — useMenuPanel widens the window by MENU_PANEL_WIDTH rather than
// taking space from the list, so nothing is covered. This gives that panel a
// direct, always-visible affordance instead of burying it behind a menu.
//
// It is a real flex column in .window-shell rather than an absolute overlay:
// as an overlay it sat on top of entry rows and the scrollbar, and it has to
// stay put at any window size, including full screen.
import { useUi } from '../../hooks/use-ui.js';

export function LorebookTab() {
  const activeMenuPanel    = useUi((s) => s.activeMenuPanel);
  const setActiveMenuPanel = useUi((s) => s.setActiveMenuPanel);

  const open = activeMenuPanel === 'lorebooks';

  return (
    <button
      type="button"
      className={`lorebook-tab${open ? ' lorebook-tab--open' : ''}`}
      onClick={() => setActiveMenuPanel(open ? null : 'lorebooks')}
      title={open ? 'Close the lorebook panel' : 'Open the lorebook panel'}
      aria-label={open ? 'Close the lorebook panel' : 'Open the lorebook panel'}
      aria-expanded={open}
      // The header owns window-dragging via pointer events; this sits on the
      // frame edge, so stop the gesture reaching any drag handler behind it.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="lorebook-tab-inner">
        <span className="lorebook-tab-arrow" aria-hidden="true">{open ? '›' : '‹'}</span>
        <span className="lorebook-tab-label">LOREBOOKS</span>
      </span>
    </button>
  );
}
