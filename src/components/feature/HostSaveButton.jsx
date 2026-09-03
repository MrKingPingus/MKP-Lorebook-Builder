// The one explicit write to CharSnap. Lives in the window header in host mode
// (the hotbar gets a Save slot too). A dot marks unsaved changes; the button
// disables while a save is out or before the host has sent a lorebook.
import { useHostState } from '../../hooks/use-host.js';
import { useKeybindings } from '../../hooks/use-keybindings.js';

export function HostSaveButton({ compact = false }) {
  const loaded     = useHostState((s) => s.loaded);
  const dirty      = useHostState((s) => s.dirty);
  const saving     = useHostState((s) => s.saving);
  const saveToHost = useHostState((s) => s.saveToHost);
  const { displayChord } = useKeybindings();

  const chord = displayChord('save_to_host');
  const title = saving
    ? 'Saving to CharSnap…'
    : dirty
      ? `Unsaved changes — save to CharSnap${chord ? ` (${chord})` : ''}`
      : `Everything is saved to CharSnap${chord ? ` (${chord})` : ''}`;

  return (
    <button
      type="button"
      className={`host-save-btn touch-floor${dirty ? ' host-save-btn--dirty' : ''}${saving ? ' host-save-btn--saving' : ''}`}
      onClick={() => saveToHost?.()}
      onPointerDown={(e) => e.stopPropagation()}
      disabled={!loaded || saving || !saveToHost}
      title={title}
      aria-label="Save to CharSnap"
    >
      <span className="host-save-dot" aria-hidden="true" />
      {saving ? 'Saving…' : compact ? 'Save' : 'Save to CharSnap'}
    </button>
  );
}
