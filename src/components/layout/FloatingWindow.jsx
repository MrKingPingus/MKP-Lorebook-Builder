// Draggable resizable floating window shell — applies position and size from ui-store, owns resize handles
import { useUi }          from '../../hooks/use-ui.js';
import { WindowHeader }   from './WindowHeader.jsx';
import { WindowFooter }   from './WindowFooter.jsx';
import { ResizeHandles }  from './ResizeHandles.jsx';
import { BuildPanel }         from '../feature/BuildPanel.jsx';
import { ImportPanel }        from '../feature/ImportPanel.jsx';
import { ExportPanel }        from '../feature/ExportPanel.jsx';
import { SettingsPanel }      from '../feature/SettingsPanel.jsx';
import { Lander }             from '../feature/Lander.jsx';
import { AppendImportPanel }  from '../feature/AppendImportPanel.jsx';

export function FloatingWindow() {
  const windowPos  = useUi((s) => s.windowPos);
  const windowSize = useUi((s) => s.windowSize);
  const activeTab        = useUi((s) => s.activeTab);
  const showLander       = useUi((s) => s.showLander);
  const showAppendImport = useUi((s) => s.showAppendImport);

  const style = {
    left:   windowPos.x,
    top:    windowPos.y,
    width:  windowSize.width,
    height: windowSize.height,
  };

  function panelStyle(id) {
    return activeTab === id
      ? { flex: 1, minHeight: 0 }
      : { display: 'none' };
  }

  return (
    <div className="floating-window" style={style}>
      {/* Golden corner bracket decorations */}
      <span className="corner corner--nw" />
      <span className="corner corner--ne" />
      <span className="corner corner--sw" />
      <span className="corner corner--se" />

      {showLander ? (
        <div className="window-body window-body--lander">
          <Lander />
        </div>
      ) : (
        <>
          <WindowHeader />

          <div className="window-body">
            {/* All three panels are always mounted; inactive ones are hidden with display:none
                so React state (entry expand/collapse, etc.) survives tab switches. */}
            <div style={panelStyle('build')}>
              <BuildPanel />
            </div>
            <div className="tab-split" style={panelStyle('import-export')}>
              <ImportPanel />
              <ExportPanel />
            </div>
            <div style={panelStyle('settings')}>
              <SettingsPanel />
            </div>

            {/* Footer "Import Entries" overlay — appends entries to active lorebook */}
            {showAppendImport && <AppendImportPanel />}
          </div>

          <WindowFooter />
        </>
      )}

      <ResizeHandles />
    </div>
  );
}
