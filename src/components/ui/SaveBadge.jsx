// "✓ Saved" status indicator badge shown in the window header after a successful autosave
import { useUiStore } from '../../state/ui-store.js';

export function SaveBadge() {
  const savedAt = useUiStore((s) => s.savedAt);
  if (!savedAt) return null;
  return <span className="save-badge">✓ Saved</span>;
}
