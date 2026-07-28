// Modifier+click selection macros: shift adds, ctrl/cmd removes, and shift
// with either adds or removes a whole range measured from the last-clicked
// entry.
//
// The caller supplies `orderedIds` — display order, straight off the render
// tree — because only the list component knows what is currently on screen and
// in what order. Search, the type filter, the folder filter and the sort mode
// all shape that list, so a range automatically means "between these two rows
// as they sit right now".
import { useUiStore } from '../state/ui-store.js';
import { resolveSelectionClick } from '../services/selection-range.js';
import { SELECTION_ACTIONS } from '../constants/selection.js';

export function useSelectionMacros() {
  const searchMode         = useUiStore((s) => s.searchMode);
  const selectionAnchorId  = useUiStore((s) => s.selectionAnchorId);
  const setSearchMode      = useUiStore((s) => s.setSearchMode);
  const setSelectionAnchor = useUiStore((s) => s.setSelectionAnchor);
  const selectAllVisible   = useUiStore((s) => s.selectAllVisible);
  const deselectIds        = useUiStore((s) => s.deselectIds);

  const isSelectMode = searchMode === 'select';
  // Find-replace owns its own click behaviour and a stray shift+click shouldn't
  // yank the user out of it mid-replace. Macros arm from plain search mode and
  // from select mode only.
  const armed = searchMode === 'search' || isSelectMode;

  // Returns true when the click was consumed as a macro, so the caller can stop
  // it before it reaches whatever the plain click would normally have done.
  function handleSelectionClick(event, targetId, side = 'active', orderedIds = []) {
    if (!armed) return false;

    const plan = resolveSelectionClick({
      shiftKey: event.shiftKey,
      ctrlKey:  event.ctrlKey,
      metaKey:  event.metaKey,
      orderedIds,
      anchorId: selectionAnchorId,
      targetId,
      isSelectMode,
    });
    if (plan.action === SELECTION_ACTIONS.NONE) return false;

    // Shift+click is the only way in: it opens select mode with that entry
    // already selected, which is the whole point of the gesture.
    if (!isSelectMode) setSearchMode('select');

    if (plan.action === SELECTION_ACTIONS.ADD) selectAllVisible(plan.ids, side);
    else                                      deselectIds(plan.ids);
    setSelectionAnchor(plan.anchorId);

    // Shift+click otherwise extends the browser's native text selection across
    // the rows it passes over, which looks broken and leaves stray highlights.
    event.preventDefault();
    window.getSelection?.()?.removeAllRanges();
    return true;
  }

  // Shift+click on a folder header takes its whole subtree; ctrl+click gives it
  // back, keeping the header consistent with the same shift-adds/ctrl-removes
  // rule the entry rows follow. Anchoring on the last entry means a following
  // shift+click carries on from the bottom of the folder rather than from
  // wherever the user last clicked an entry.
  function selectFolderEntries(ids, side = 'active', { remove = false } = {}) {
    if (!armed) return false;
    if (!ids || ids.length === 0) return false;
    if (remove && !isSelectMode) return false;   // nothing selected to remove
    if (!isSelectMode) setSearchMode('select');
    if (remove) deselectIds(ids);
    else        selectAllVisible(ids, side);
    setSelectionAnchor(ids[ids.length - 1]);
    window.getSelection?.()?.removeAllRanges();
    return true;
  }

  return { handleSelectionClick, selectFolderEntries, macrosArmed: armed };
}
