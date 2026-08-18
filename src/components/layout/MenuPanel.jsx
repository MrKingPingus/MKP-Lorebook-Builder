// Side panel container — slides in to the right of Build when a menu item is selected
import { useUi }           from '../../hooks/use-ui.js';
import { LorebookPanel }   from '../feature/LorebookPanel.jsx';
import { ImportPanel }     from '../feature/ImportPanel.jsx';
import { ExportPanel }     from '../feature/ExportPanel.jsx';
import { SettingsPanel }   from '../feature/SettingsPanel.jsx';
import { useDismissLayer } from '../../hooks/use-dismiss-layer.js';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';

const PANEL_TITLES = {
  'lorebooks':     'Lorebooks',
  'import-export': 'Import / Export',
  'settings':      'Settings',
};

// Show the active section, hide the rest — all stay mounted so state is preserved
function sectionStyle(id, active) {
  return active === id
    ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }
    : { display: 'none' };
}

export function MenuPanel() {
  const activeMenuPanel    = useUi((s) => s.activeMenuPanel);
  const setActiveMenuPanel = useUi((s) => s.setActiveMenuPanel);

  // The panel is always in layout, collapsed to zero width and hidden via
  // `visibility` (see style.css). That is what makes this a single derived
  // boolean rather than a state machine: an element arriving from display:none
  // has no laid-out start width, so its transition is skipped entirely no matter
  // how many frames you defer the class by. Kept in layout, it just animates.
  //
  // The window grows by exactly what the panel grows by, over the same duration
  // and easing, so the entry list beside it holds a constant width throughout.
  const expanded = activeMenuPanel !== null;

  useDismissLayer('menu-panel', expanded, DISMISS_PRIORITY.modal, () => setActiveMenuPanel(null));

  return (
    <div className={`menu-panel${expanded ? ' menu-panel--expanded' : ''}`}>
      <div className="menu-panel-header">
        <span className="menu-panel-title">
          {activeMenuPanel ? PANEL_TITLES[activeMenuPanel] : ''}
        </span>
        <button
          className="menu-panel-close touch-floor"
          onClick={() => setActiveMenuPanel(null)}
          title="Close panel"
        >
          ×
        </button>
      </div>

      <div className="menu-panel-body">
        <div style={sectionStyle('lorebooks', activeMenuPanel)}>
          <LorebookPanel />
        </div>
        <div className="tab-split" style={sectionStyle('import-export', activeMenuPanel)}>
          <ImportPanel />
          <ExportPanel />
        </div>
        <div style={sectionStyle('settings', activeMenuPanel)}>
          <SettingsPanel />
        </div>
      </div>
    </div>
  );
}
