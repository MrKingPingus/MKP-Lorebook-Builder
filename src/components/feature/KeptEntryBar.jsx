// Mobile "Keep in view" bar (#137): a slim row under the entry editor's header
// naming the kept entry, which opens it in a full-screen peek. A phone has no
// room to show two entries side by side, so this is a one-tap flip instead.
// Hidden while the editor is showing the kept entry itself.
import { useKeptEntry } from '../../hooks/use-kept-entry.js';
import { ENTRY_TYPES }  from '../../constants/entry-types.js';

export function KeptEntryBar() {
  const { keptEntry, isOpenInEditor, openPeek } = useKeptEntry();
  if (!keptEntry || isOpenInEditor) return null;

  const typeColor = ENTRY_TYPES.find((t) => t.id === keptEntry.type)?.color ?? '#9ba1ad';

  return (
    <button type="button" className="kept-bar touch-floor" onClick={openPeek}>
      <span className="kept-bar-label">In view:</span>
      <span className="kept-bar-name" style={{ color: typeColor }}>{keptEntry.name || '(unnamed)'}</span>
      <span className="kept-bar-go">Show ›</span>
    </button>
  );
}
