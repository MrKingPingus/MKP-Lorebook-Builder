// The keybinding table for Settings → Hotkeys. Lists every registry action by
// category with a capture control, a reset, and a duplicate warning. Assigning
// a chord gives it solely to that action (any other custom binding on the same
// chord is cleared); a remaining clash against another action's default chord
// is surfaced non-blockingly.
import { useKeybindings }  from '../../hooks/use-keybindings.js';
import { KeyChordCapture } from './KeyChordCapture.jsx';
import { useUi }           from '../../hooks/use-ui.js';

export function KeybindingSettings() {
  const { rowsByCategory, assign, reset, resetAll, conflictFor } = useKeybindings();
  const toggleKeyboardHelp = useUi((s) => s.toggleKeyboardHelp);

  return (
    <div className="kbd-settings">
      <div className="settings-hint">
        Click a shortcut, then press the keys you want. Browser-reserved combos
        (Ctrl+T, Ctrl+W…) and bare letters can’t be assigned. Actions marked
        <span className="kbd-soon-tag">soon</span> are reserved for a future update.
      </div>

      {rowsByCategory.map((cat) => (
        <div key={cat.id} className="kbd-settings-group">
          <div className="kbd-settings-group-title">{cat.label}</div>
          {cat.rows.map((row) => {
            const clash = conflictFor(row.primaryChord, row.id);
            return (
              <div key={row.id} className="kbd-settings-row">
                <span className="kbd-settings-label">
                  {row.label}
                  {!row.wired && <span className="kbd-soon-tag" title="Coming soon">soon</span>}
                </span>
                <span className="kbd-settings-controls">
                  {row.fixed ? (
                    row.displayChords.map((c, i) => <kbd key={i} className="kbd-chip kbd-chip--fixed">{c}</kbd>)
                  ) : (
                    <>
                      <KeyChordCapture row={row} onAssign={(chord) => assign(row.id, chord)} />
                      {row.isCustom && (
                        <button
                          type="button"
                          className="kbd-reset-btn"
                          onClick={() => reset(row.id)}
                          title="Reset to default"
                        >
                          ↺
                        </button>
                      )}
                    </>
                  )}
                </span>
                {clash && (
                  <span className="kbd-settings-warn" title={`Also used by ${clash.label}`}>
                    ⚠ shared with {clash.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div className="kbd-settings-actions">
        <button type="button" className="kbd-help-link" onClick={toggleKeyboardHelp}>
          View all shortcuts
        </button>
        <button type="button" className="kbd-reset-all" onClick={resetAll}>
          Reset all to defaults
        </button>
      </div>
    </div>
  );
}
