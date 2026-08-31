// The per-entry ⋯ overflow menu, in the card header where Remove used to sit.
//
// Phase 12's plan flagged the footer as heading for an overflow problem before
// it had one: Phase 11 put "Move to folder" there, Phase 12 was going to add
// two template buttons, and the row already held checkpoints, visibility and
// public/private. This is that overflow menu.
//
// Two things about the placement are deliberate rather than incidental.
//
// **It replaces Remove in the HEADER, not the footer.** Remove was the only
// per-entry action living up there; everything else was in the footer, which
// renders only on an expanded card. Gathering them into a header menu makes
// visibility, folder and delete reachable on a COLLAPSED card for the first
// time — the actions you most want when skimming a long book are exactly the
// ones you previously had to open an entry to reach.
//
// **The footer keeps Checkpoints.** It is the one control there that opens a
// panel rather than performing an action, and it owns a section of the card.
//
// Submenus drill in rather than fanning out sideways. A nested popover inside a
// scrolling list has to solve flipping twice over; a drill-in re-uses the panel
// that is already placed, and it is the shape Phase 12's template folders were
// always going to need (locked decision 7).
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal }        from 'react-dom';
import { useAnchoredPosition } from '../../hooks/use-anchored-position.js';
import { useDismissLayer }     from '../../hooks/use-dismiss-layer.js';
import { useFolders }          from '../../hooks/use-folders.js';
import { DISMISS_PRIORITY }    from '../../services/dismiss-stack.js';
import { NO_FOLDER_LABEL, NEW_FOLDER_NAME } from '../../constants/folders.js';
import { ENTRY_MENU_WIDTH_PX }  from '../../constants/limits.js';

const VIEW_ROOT   = 'root';
const VIEW_FOLDER = 'folder';

export function EntryActionsMenu({ entry, onUpdate, onRemove }) {
  const { folders, moveEntryToFolder, createFolderWithEntries, foldersSuppressed } = useFolders();
  const [open, setOpen]   = useState(false);
  const [view, setView]   = useState(VIEW_ROOT);
  const [anchor, setAnchor] = useState(null);
  const btnRef  = useRef(null);
  const menuRef = useRef(null);

  const style = useAnchoredPosition(anchor, ENTRY_MENU_WIDTH_PX);
  const currentFolder = folders.find((f) => f.id === entry.folderId) ?? null;

  const close = useCallback(() => {
    setOpen(false);
    setView(VIEW_ROOT); // never reopen mid-drill-in
  }, []);

  useDismissLayer(`entry-actions-${entry.id}`, open, DISMISS_PRIORITY.popover, () => {
    // Escape backs out of a submenu before it closes the menu, so a mistaken
    // drill-in costs one key rather than the whole journey.
    if (view !== VIEW_ROOT) setView(VIEW_ROOT);
    else close();
  });

  // Anchored to a rect rather than positioned by CSS: the card sits inside a
  // scrolling list with `overflow-y: auto`, which clips absolutely positioned
  // descendants — the menu on the last card would be cut off at the list edge.
  function toggle(e) {
    e.stopPropagation();
    if (open) { close(); return; }
    setAnchor(btnRef.current?.getBoundingClientRect() ?? null);
    setView(VIEW_ROOT);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (menuRef.current?.contains(e.target)) return;
      if (btnRef.current?.contains(e.target)) return;
      close();
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, close]);

  // The menu is position: fixed, so a scroll of the entry list slides the card
  // out from under it. It follows the button rather than closing.
  //
  // Closing was the first approach and it is what the other anchored popovers
  // here do — but they hang off chrome that does not scroll. This one hangs off
  // a row in a scrolling list, and closing broke it twice over. Expanding a card
  // smooth-scrolls it into view, and a smooth scroll keeps firing events for
  // several hundred milliseconds afterwards — long enough that opening this menu
  // straight after expanding anything had it flash open and shut. And the
  // listener must be capture-phase to see the list scroll at all (scroll does
  // not bubble), so it also saw scrolls inside the MENU, whose own list scrolls
  // once a book has more folders than fit: scrolling the menu closed the menu.
  //
  // Following the anchor makes both of those non-events. Closing is left for the
  // one case where it is the honest answer — the button scrolling out of sight,
  // where the menu would otherwise hang off nothing.
  useEffect(() => {
    if (!open) return undefined;
    let frame = 0;
    function reposition() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = btnRef.current?.getBoundingClientRect();
        if (!rect) { close(); return; }
        if (rect.bottom < 0 || rect.top > window.innerHeight) { close(); return; }
        setAnchor((prev) =>
          prev && prev.top === rect.top && prev.right === rect.right ? prev : rect);
      });
    }
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, close]);

  function act(fn) {
    return (e) => {
      e.stopPropagation();
      fn();
      close();
    };
  }

  const isPublic = entry.isPublic === true;
  const isHidden = !!entry.hiddenFromExport;

  return (
    <>
      <button
        ref={btnRef}
        className={`card-action-btn entry-actions-btn${open ? ' entry-actions-btn--open' : ''}`}
        onClick={toggle}
        title="More actions for this entry"
        aria-label="More actions for this entry"
        aria-haspopup="menu"
        aria-expanded={open}
        type="button"
      >
        ⋯
      </button>

      {open && style && createPortal(
        <div
          ref={menuRef}
          className="entry-actions-menu"
          style={{ ...style, width: ENTRY_MENU_WIDTH_PX }}
          role="menu"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {view === VIEW_ROOT && (
            <>
              <button
                className="entry-actions-item"
                onClick={(e) => { e.stopPropagation(); setView(VIEW_FOLDER); }}
                disabled={foldersSuppressed}
                title={foldersSuppressed
                  ? 'Folders are hidden while sorting by cross-book matches — switch sort to use them'
                  : undefined}
                role="menuitem"
                type="button"
              >
                <span className="entry-actions-item-label">
                  {currentFolder ? `🗀 ${currentFolder.name || NEW_FOLDER_NAME}` : 'Move to folder'}
                </span>
                <span className="entry-actions-chevron" aria-hidden="true">›</span>
              </button>

              {/* Both of these are states as much as actions, so each carries a
                  tick showing where it stands — the header badges say the same
                  thing on the card, but only for the state worth flagging. */}
              <button
                className="entry-actions-item"
                onClick={act(() => onUpdate({ isPublic: !isPublic }, true))}
                title={isPublic
                  ? 'Public on CharSnap — choose to make private'
                  : 'Private on CharSnap — choose to make public'}
                role="menuitemcheckbox"
                aria-checked={isPublic}
                type="button"
              >
                <span className="entry-actions-tick" aria-hidden="true">{isPublic ? '✓' : ''}</span>
                <span className="entry-actions-item-label">Public on CharSnap</span>
              </button>

              <button
                className="entry-actions-item"
                onClick={act(() => onUpdate({ hiddenFromExport: !isHidden }, true))}
                title="Exclude this entry from JSON export"
                role="menuitemcheckbox"
                aria-checked={isHidden}
                type="button"
              >
                <span className="entry-actions-tick" aria-hidden="true">{isHidden ? '✓' : ''}</span>
                <span className="entry-actions-item-label">Hide from Export</span>
              </button>

              <div className="entry-actions-divider" role="separator" />

              <button
                className="entry-actions-item entry-actions-item--destructive"
                onClick={act(() => onRemove(entry.id))}
                role="menuitem"
                type="button"
              >
                <span className="entry-actions-item-label">Delete entry</span>
              </button>
            </>
          )}

          {view === VIEW_FOLDER && (
            <>
              <button
                className="entry-actions-back"
                onClick={(e) => { e.stopPropagation(); setView(VIEW_ROOT); }}
                type="button"
              >
                ‹ Move to folder
              </button>

              <button
                className={`entry-actions-item${!currentFolder ? ' entry-actions-item--active' : ''}`}
                onClick={act(() => moveEntryToFolder(entry.id, null))}
                role="menuitem"
                type="button"
              >
                <span className="entry-actions-item-label">{NO_FOLDER_LABEL}</span>
              </button>

              {folders.map((f) => (
                <button
                  key={f.id}
                  className={`entry-actions-item${f.id === entry.folderId ? ' entry-actions-item--active' : ''}`}
                  onClick={act(() => moveEntryToFolder(entry.id, f.id))}
                  role="menuitem"
                  type="button"
                >
                  <span className="entry-actions-dot" style={{ background: f.color }} />
                  <span className="entry-actions-item-label">{f.name || NEW_FOLDER_NAME}</span>
                </button>
              ))}

              <div className="entry-actions-divider" role="separator" />
              <button
                className="entry-actions-item"
                onClick={act(() => createFolderWithEntries([entry.id]))}
                role="menuitem"
                type="button"
              >
                <span className="entry-actions-item-label">＋ New folder</span>
              </button>
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
