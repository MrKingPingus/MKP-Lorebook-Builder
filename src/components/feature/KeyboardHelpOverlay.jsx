// Keyboard-shortcuts cheat sheet — opened by the `keyboard_help` hotkey (`?`).
// Auto-generated from the keybinding registry so it always reflects custom
// bindings. Registers as the top-priority dismiss layer while open, so Escape
// closes it before anything beneath.
import { useKeybindings }  from '../../hooks/use-keybindings.js';
import { useDismissLayer } from '../../hooks/use-dismiss-layer.js';
import { useUi }           from '../../hooks/use-ui.js';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';
import { SELECTION_GESTURES, SELECTION_GESTURES_LABEL } from '../../constants/selection.js';

export function KeyboardHelpOverlay() {
  const open                  = useUi((s) => s.keyboardHelpOpen);
  const setKeyboardHelpOpen   = useUi((s) => s.setKeyboardHelpOpen);
  const openSettingsSection   = useUi((s) => s.openSettingsSection);
  const { rowsByCategory } = useKeybindings();

  useDismissLayer('keyboard-help', open, DISMISS_PRIORITY.popover, () => setKeyboardHelpOpen(false));

  if (!open) return null;

  function editShortcuts() {
    setKeyboardHelpOpen(false);
    openSettingsSection('accessibility');
  }

  return (
    <div className="kbd-help-backdrop" onClick={() => setKeyboardHelpOpen(false)}>
      <div
        className="kbd-help-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kbd-help-header">
          <h2 className="kbd-help-title">Keyboard shortcuts</h2>
          <button className="kbd-help-close" onClick={() => setKeyboardHelpOpen(false)} aria-label="Close">✕</button>
        </div>

        <div className="kbd-help-body">
          {rowsByCategory.map((cat) => (
            <section key={cat.id} className="kbd-help-group">
              <h3 className="kbd-help-group-title">{cat.label}</h3>
              <ul className="kbd-help-list">
                {cat.rows.map((row) => (
                  <li key={row.id} className="kbd-help-row">
                    <span className="kbd-help-label">
                      {row.label}
                      {row.isCustom && <span className="kbd-help-custom" title="Custom binding"> ·custom</span>}
                      {!row.wired && <span className="kbd-help-soon" title="Coming soon"> ·soon</span>}
                    </span>
                    <span className="kbd-help-keys">
                      {row.displayChords.map((chord, i) => (
                        <kbd key={i} className="kbd-help-key">{chord}</kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {/* Mouse gestures aren't rebindable, so they aren't in the registry —
              but this overlay is where people look for "how do I do X". */}
          <section className="kbd-help-group">
            <h3 className="kbd-help-group-title">{SELECTION_GESTURES_LABEL}</h3>
            <ul className="kbd-help-list">
              {SELECTION_GESTURES.map((g) => (
                <li key={g.id} className="kbd-help-row">
                  <span className="kbd-help-label">{g.label}</span>
                  <span className="kbd-help-keys">
                    {g.keys.map((k, i) => (
                      <kbd key={i} className="kbd-help-key">{k}</kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="kbd-help-footer">
          <button className="kbd-help-edit" onClick={editShortcuts}>Edit shortcuts…</button>
        </div>
      </div>
    </div>
  );
}
