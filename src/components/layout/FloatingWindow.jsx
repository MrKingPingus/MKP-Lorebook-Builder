// Draggable resizable floating window shell — applies position and size from ui-store, owns resize handles
import { useUi }             from '../../hooks/use-ui.js';
import { useMobile }         from '../../hooks/use-mobile.js';
import { useMenuPanel }      from '../../hooks/use-menu-panel.js';
import { CROSSTALK_ENABLED } from '../../constants/crosstalk.js';
import { WindowHeader }      from './WindowHeader.jsx';
import { Hotbar }            from './Hotbar.jsx';
import { ResizeHandles }     from './ResizeHandles.jsx';
import { MenuPanel }         from './MenuPanel.jsx';
import { BuildPanel }          from '../feature/BuildPanel.jsx';
import { ReferencePanel }      from '../feature/ReferencePanel.jsx';
import { GlobalFilterBar }     from '../feature/GlobalFilterBar.jsx';
import { Lander }              from '../feature/Lander.jsx';
import { AppendImportPanel }   from '../feature/AppendImportPanel.jsx';
import { EntryDetailPanel }    from '../feature/EntryDetailPanel.jsx';
import { LorebookNameModal }   from '../feature/LorebookNameModal.jsx';

export function FloatingWindow() {
  const isMobile         = useMobile();
  const windowPos        = useUi((s) => s.windowPos);
  const windowSize       = useUi((s) => s.windowSize);
  const showLander       = useUi((s) => s.showLander);
  const showAppendImport = useUi((s) => s.showAppendImport);
  const activeSide       = useUi((s) => s.activeSide);

  // Handles window expansion/collapse and re-centering when menu panel opens/closes (desktop only)
  useMenuPanel();

  // On mobile: no inline position/size — CSS fills the viewport via .floating-window--mobile
  const style = isMobile ? {} : {
    left:   windowPos.x,
    top:    windowPos.y,
    width:  windowSize.width,
    height: windowSize.height,
  };

  return (
    <div className={`floating-window${isMobile ? ' floating-window--mobile' : ''}`} style={style}>
      {/* Golden corner bracket decorations — hidden on mobile via CSS */}
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
            <GlobalFilterBar />

            <div className="pane-split">
              {/* In crosstalk mode the slot contents flip with activeSide so
                  the panel the user clicked (via swap) stays in the same
                  physical position. Outside crosstalk, left is always Build. */}
              <div className="pane-split-slot">
                {CROSSTALK_ENABLED && activeSide === 'right' ? <ReferencePanel /> : <BuildPanel />}
              </div>
              {CROSSTALK_ENABLED && (
                <div className="pane-split-slot">
                  {activeSide === 'right' ? <BuildPanel /> : <ReferencePanel />}
                </div>
              )}
              <MenuPanel />
            </div>

            {/* Footer "Import Entries" overlay — appends entries to active lorebook */}
            {showAppendImport && <AppendImportPanel />}
          </div>

          <Hotbar />

          {/* Mobile full-screen entry editor — overlays everything when an entry is tapped */}
          {isMobile && <EntryDetailPanel />}

          {/* Lorebook name prompt — appears after new lorebook creation */}
          <LorebookNameModal />
        </>
      )}

      {/* Resize handles only on desktop */}
      {!isMobile && <ResizeHandles />}
    </div>
  );
}
