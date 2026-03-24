// Draggable resizable floating window shell — applies position and size from ui-store, owns resize handles
import { useUiStore }     from '../../state/ui-store.js';
import { WindowHeader }   from './WindowHeader.jsx';
import { WindowFooter }   from './WindowFooter.jsx';
import { ResizeHandles }  from './ResizeHandles.jsx';
import { BuildPanel }     from '../feature/BuildPanel.jsx';
import { ImportPanel }    from '../feature/ImportPanel.jsx';
import { ExportPanel }    from '../feature/ExportPanel.jsx';
import { SettingsPanel }  from '../feature/SettingsPanel.jsx';

function PanelSwitch({ tab }) {
  if (tab === 'build')         return <BuildPanel />;
  if (tab === 'import-export') return (
    <div className="tab-split">
      <ImportPanel />
      <ExportPanel />
    </div>
  );
  if (tab === 'settings')      return <SettingsPanel />;
  return null;
}

export function FloatingWindow() {
  const windowPos  = useUiStore((s) => s.windowPos);
  const windowSize = useUiStore((s) => s.windowSize);
  const activeTab  = useUiStore((s) => s.activeTab);

  const style = {
    left:   windowPos.x,
    top:    windowPos.y,
    width:  windowSize.width,
    height: windowSize.height,
  };

  return (
    <div className="floating-window" style={style}>
      {/* Golden corner bracket decorations */}
      <span className="corner corner--nw" />
      <span className="corner corner--ne" />
      <span className="corner corner--sw" />
      <span className="corner corner--se" />

      <WindowHeader />

      <div className="window-body">
        <PanelSwitch tab={activeTab} />
      </div>

      <WindowFooter />
      <ResizeHandles />
    </div>
  );
}
