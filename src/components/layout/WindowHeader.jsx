// Window title bar — renders lorebook name input, SaveBadge, and undo/redo buttons
import { useDragWindow }  from '../../hooks/use-drag-window.js';
import { useUndoRedo }    from '../../hooks/use-undo-redo.js';
import { useLorebook }    from '../../hooks/use-lorebook.js';
import { SaveBadge }      from '../ui/SaveBadge.jsx';
import { LorebookSwitcher } from '../feature/LorebookSwitcher.jsx';

export function WindowHeader() {
  const { onPointerDown } = useDragWindow();
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const { activeLorebook, renameLorebook } = useLorebook();

  return (
    <div className="window-header" onPointerDown={onPointerDown}>
      <LorebookSwitcher />
      <input
        className="lorebook-name-input"
        value={activeLorebook?.name ?? ''}
        onChange={(e) => renameLorebook(e.target.value)}
        placeholder="Lorebook name…"
        onPointerDown={(e) => e.stopPropagation()}
        spellCheck={false}
      />
      <div className="header-right">
        <SaveBadge />
        <button
          className="icon-btn"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >↩</button>
        <button
          className="icon-btn"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >↪</button>
      </div>
    </div>
  );
}
