// Side panel container — slides in to the right of Build when a menu item is selected
import { useUi }           from '../../hooks/use-ui.js';
import { LorebookPanel }   from '../feature/LorebookPanel.jsx';
import { ImportPanel }     from '../feature/ImportPanel.jsx';
import { ExportPanel }     from '../feature/ExportPanel.jsx';
import { SettingsPanel }   from '../feature/SettingsPanel.jsx';

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

  return (
    <div className="menu-panel" style={activeMenuPanel ? undefined : { display: 'none' }}>
      <div className="menu-panel-header">
        <span className="menu-panel-title">
          {activeMenuPanel ? PANEL_TITLES[activeMenuPanel] : ''}
        </span>
        <button
          className="menu-panel-close"
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
