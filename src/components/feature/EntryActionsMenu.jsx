// The per-entry ⋯ overflow menu, in the card header where Remove used to sit.
//
// Phase 12's plan flagged the footer as heading for an overflow problem before
// it had one: Phase 11 put "Move to folder" there, Phase 12 was going to add
// two template buttons, and the row already held checkpoints, visibility and
// public/private. This is that overflow menu.
//
// Three things about it are deliberate rather than incidental.
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
// **Submenus are hover flyouts, not drill-ins.** They opened as drill-ins
// first — the panel was reused for the submenu and a ‹ Back row led out of it —
// which is cheap to build and wrong to use: every submenu cost a click to enter
// and a click to leave, and while you were in one the menu no longer showed you
// what else it could do. A flyout keeps the root menu on screen the whole time,
// and browsing between the three submenus costs no clicks at all. The footer's
// sizing menu already worked this way, so `components/ui/Flyout.jsx` is now the
// one implementation both use — it opens right and flips left only when the
// viewport has no room.
//
// **Copy to lorebook ends in a receipt inside its flyout.** Every other action
// here changes something the user can see — the card re-renders, a badge
// appears, the row leaves the list. A copy is the one that acts on a book which
// is not on screen, so simply closing would leave "it worked" and "it did
// nothing" looking identical. A MOVE gets no receipt and does not need one: the
// row leaves the list, so this menu unmounts with the card it hangs off, and
// the move already named its destination in the confirmation just answered.
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal }        from 'react-dom';
import { Flyout }              from '../ui/Flyout.jsx';
import { TemplatesPanel }      from './TemplatesPanel.jsx';
import { useAnchoredPosition } from '../../hooks/use-anchored-position.js';
import { useDismissLayer }     from '../../hooks/use-dismiss-layer.js';
import { useFolders }          from '../../hooks/use-folders.js';
import { useEntryTransfer, TRANSFER_COPY, TRANSFER_MOVE } from '../../hooks/use-entry-transfer.js';
import { DISMISS_PRIORITY }    from '../../services/dismiss-stack.js';
import { NO_FOLDER_LABEL, NEW_FOLDER_NAME } from '../../constants/folders.js';
import { ENTRY_MENU_WIDTH_PX, MAX_LOREBOOKS } from '../../constants/limits.js';
import { FLYOUT_OPEN_MS, FLYOUT_CLOSE_MS }    from '../../constants/scaling.js';

const SUB_COPY      = 'copy';
const SUB_MOVE      = 'move';
const SUB_FOLDER    = 'folder';
const SUB_TEMPLATES = 'templates';

/** A root row that owns a flyout. Hover opens it, click toggles it, and the
 *  pointer may cross the gap to the panel without losing it — see the grace
 *  timers in the parent. */
function SubmenuRow({ id, label, title, disabled, openSub, onHover, onLeave, onToggle, children }) {
  const open   = openSub === id;
  const rowRef = useRef(null);

  return (
    <div
      ref={rowRef}
      className="entry-actions-rowwrap"
      onMouseEnter={() => !disabled && onHover(id)}
      onMouseLeave={onLeave}
    >
      <button
        className={`entry-actions-item${open ? ' entry-actions-item--open' : ''}`}
        onClick={(e) => { e.stopPropagation(); if (!disabled) onToggle(id); }}
        disabled={disabled}
        title={title}
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        type="button"
      >
        <span className="entry-actions-item-label">{label}</span>
        <span className="entry-actions-chevron" aria-hidden="true">›</span>
      </button>

      {open && (
        <Flyout
          className="entry-actions-flyout"
          anchorEl={rowRef.current}
          align="top"
          onMouseEnter={() => onHover(id, true)}
          onMouseLeave={onLeave}
        >
          {children}
        </Flyout>
      )}
    </div>
  );
}

export function EntryActionsMenu({ entry, onUpdate, onRemove }) {
  const { folders, moveEntryToFolder, createFolderWithEntries, foldersSuppressed } = useFolders();
  const { transferTargets, canCreateTarget, transferTo, transferToNewLorebook, goToLorebook } = useEntryTransfer();
  const [open, setOpen]     = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [openSub, setOpenSub] = useState(null);
  // The "✓ Copied to X" panel that replaces a transfer flyout's list once one
  // lands, and the inline name field behind ＋ New lorebook…
  const [result, setResult]       = useState(null);
  const [namingNew, setNamingNew] = useState(false);
  const [newName, setNewName]     = useState('');
  // The templates panel holds its own half-typed state (a template name, a
  // rename, a checklist mid-tick). It says so through onPin rather than this
  // menu trying to guess, because only the panel knows when it has something
  // to lose.
  const [panelPinned, setPanelPinned] = useState(false);
  const btnRef     = useRef(null);
  const menuRef    = useRef(null);
  const newNameRef = useRef(null);
  const openTimer  = useRef(null);
  const closeTimer = useRef(null);

  const style = useAnchoredPosition(anchor, ENTRY_MENU_WIDTH_PX);
  const currentFolder = folders.find((f) => f.id === entry.folderId) ?? null;

  // A flyout showing a name field or a receipt is holding something the user
  // would lose — so it stops tracking the pointer and waits to be dismissed.
  const pinned = namingNew || !!result || panelPinned;

  const closeSub = useCallback(() => {
    setOpenSub(null);
    setResult(null);
    setNamingNew(false);
    setNewName('');
    setPanelPinned(false);
  }, []);

  const close = useCallback(() => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    setOpen(false);
    closeSub();
  }, [closeSub]);

  useEffect(() => () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  }, []);

  // Hover grace, matching the sizing menu's: opening is delayed so a pointer
  // crossing the menu on its way somewhere else doesn't unfurl every row it
  // passes, and closing is delayed longer so the gap between a row and its
  // panel doesn't drop it mid-reach.
  function hoverSub(id, immediate = false) {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    if (pinned && openSub !== id) return; // don't yank a field or receipt away
    if (immediate || openSub !== null) { setOpenSub(id); return; }
    openTimer.current = setTimeout(() => setOpenSub(id), FLYOUT_OPEN_MS);
  }

  function leaveSub() {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    if (pinned) return;
    closeTimer.current = setTimeout(closeSub, FLYOUT_CLOSE_MS);
  }

  function toggleSub(id) {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    if (openSub === id) closeSub();
    else { setResult(null); setNamingNew(false); setNewName(''); setOpenSub(id); }
  }

  useDismissLayer(`entry-actions-${entry.id}`, open, DISMISS_PRIORITY.popover, () => {
    // Escape unwinds one layer at a time, so a mistaken hover costs one key
    // rather than the whole journey: a name field first, then the flyout, then
    // the menu.
    if (namingNew) { setNamingNew(false); setNewName(''); }
    else if (openSub) closeSub();
    else close();
  });

  // Anchored to a rect rather than positioned by CSS: the card sits inside a
  // scrolling list with `overflow-y: auto`, which clips absolutely positioned
  // descendants — the menu on the last card would be cut off at the list edge.
  function toggle(e) {
    e.stopPropagation();
    if (open) { close(); return; }
    setAnchor(btnRef.current?.getBoundingClientRect() ?? null);
    closeSub();
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (menuRef.current?.contains(e.target)) return;
      if (btnRef.current?.contains(e.target)) return;
      // The flyout is portalled to the body, so it is outside `menuRef` in the
      // DOM while being very much inside the menu as far as the user is
      // concerned. Matched by class rather than by ref so the shared Flyout
      // does not have to forward one.
      if (e.target instanceof Element && e.target.closest('.entry-actions-flyout')) return;
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
  // Following the anchor makes both of those non-events, and re-rendering on a
  // new anchor is also what drags any open flyout along with its row. Closing is
  // left for the one case where it is the honest answer — the button scrolling
  // out of sight, where the menu would otherwise hang off nothing.
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

  // The name row replaces the item that was just clicked, so the caret has to
  // move there or the user is typing into nothing.
  useEffect(() => {
    if (namingNew) newNameRef.current?.focus();
  }, [namingNew]);

  function act(fn) {
    return (e) => {
      e.stopPropagation();
      fn();
      close();
    };
  }

  /** Where a transfer ends up. A copy keeps its flyout open as a receipt; a
   *  move closes everything, because the card this menu belongs to is on its
   *  way out of the list. */
  function finish(res) {
    if (!res || res.mode === TRANSFER_MOVE) { close(); return; }
    setNamingNew(false);
    setNewName('');
    setResult(res);
  }

  const isPublic = entry.isPublic === true;
  const isHidden = !!entry.hiddenFromExport;

  /** The body of a Copy/Move flyout — a receipt, a name field, or the list. */
  function transferPanel(mode) {
    const moving = mode === TRANSFER_MOVE;

    if (result) {
      return (
        <>
          <div className="entry-actions-result">
            <span className="entry-actions-result-tick" aria-hidden="true">✓</span>
            <span>Copied to <strong>{result.destName || 'Untitled lorebook'}</strong></span>
          </div>
          <button
            className="entry-actions-item"
            onClick={act(() => goToLorebook(result.destId))}
            role="menuitem"
            type="button"
          >
            <span className="entry-actions-item-label">Open that lorebook</span>
          </button>
          <button
            className="entry-actions-item"
            onClick={(e) => { e.stopPropagation(); close(); }}
            role="menuitem"
            type="button"
          >
            <span className="entry-actions-item-label">Done</span>
          </button>
        </>
      );
    }

    return (
      <>
        {transferTargets.length === 0 && (
          <div className="entry-actions-note">
            This is your only lorebook. Make one below and the entry
            {moving ? ' moves' : ' is copied'} straight into it.
          </div>
        )}

        {transferTargets.map((t) => (
          <button
            key={t.id}
            className="entry-actions-item"
            onClick={(e) => { e.stopPropagation(); finish(transferTo([entry.id], t.id, mode)); }}
            role="menuitem"
            type="button"
          >
            <span className="entry-actions-item-label">{t.name || 'Untitled lorebook'}</span>
            <span className="entry-actions-count">{t.entryCount}</span>
          </button>
        ))}

        <div className="entry-actions-divider" role="separator" />

        {/* Named at the moment of creation rather than created blank and
            renamed later: the new book is NOT switched to, so there is no name
            field on screen afterwards to notice and fill in. */}
        {namingNew ? (
          <div className="entry-actions-input-row">
            <input
              ref={newNameRef}
              className="entry-actions-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter')  { e.preventDefault(); finish(transferToNewLorebook([entry.id], newName, mode)); }
                if (e.key === 'Escape') { e.preventDefault(); setNamingNew(false); setNewName(''); }
              }}
              placeholder="New lorebook name…"
              spellCheck={false}
              aria-label="Name for the new lorebook"
            />
            <button
              className="entry-actions-go"
              onClick={(e) => { e.stopPropagation(); finish(transferToNewLorebook([entry.id], newName, mode)); }}
              title={`Create this lorebook and ${moving ? 'move' : 'copy'} the entry into it`}
              aria-label="Create and transfer"
              type="button"
            >
              →
            </button>
          </div>
        ) : (
          <button
            className="entry-actions-item"
            onClick={(e) => { e.stopPropagation(); setNamingNew(true); }}
            disabled={!canCreateTarget}
            title={canCreateTarget
              ? undefined
              : `You already have the maximum of ${MAX_LOREBOOKS} lorebooks`}
            role="menuitem"
            type="button"
          >
            <span className="entry-actions-item-label">＋ New lorebook…</span>
          </button>
        )}
      </>
    );
  }

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
          {/* The three "where does this entry live" actions lead, because that
              is what a menu on a card in a list is most often opened for. Copy
              sits above Move so the reversible one is the one reached by a slip
              of the hand. */}
          <SubmenuRow
            id={SUB_COPY}
            label="Copy to lorebook"
            title="Put a copy of this entry in another lorebook, keeping this one"
            openSub={openSub} onHover={hoverSub} onLeave={leaveSub} onToggle={toggleSub}
          >
            {transferPanel(TRANSFER_COPY)}
          </SubmenuRow>

          <SubmenuRow
            id={SUB_MOVE}
            label="Move to lorebook"
            title="Send this entry to another lorebook and remove it from this one"
            openSub={openSub} onHover={hoverSub} onLeave={leaveSub} onToggle={toggleSub}
          >
            {transferPanel(TRANSFER_MOVE)}
          </SubmenuRow>

          <SubmenuRow
            id={SUB_FOLDER}
            label={currentFolder ? `🗀 ${currentFolder.name || NEW_FOLDER_NAME}` : 'Move to folder'}
            disabled={foldersSuppressed}
            title={foldersSuppressed
              ? 'Folders are hidden while sorting by cross-book matches — switch sort to use them'
              : undefined}
            openSub={openSub} onHover={hoverSub} onLeave={leaveSub} onToggle={toggleSub}
          >
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
          </SubmenuRow>

          <SubmenuRow
            id={SUB_TEMPLATES}
            label="Templates"
            title="Save this entry as a reusable template, or fill it from one"
            openSub={openSub} onHover={hoverSub} onLeave={leaveSub} onToggle={toggleSub}
          >
            <TemplatesPanel entry={entry} onDone={close} onPin={setPanelPinned} />
          </SubmenuRow>

          <div className="entry-actions-divider" role="separator" />

          {/* Both of these are states as much as actions, so each carries a
              tick showing where it stands — in the right-hand column the
              chevrons above use, so every label in the menu starts flush. */}
          <button
            className="entry-actions-item"
            onClick={act(() => onUpdate({ isPublic: !isPublic }, true))}
            onMouseEnter={leaveSub}
            title={isPublic
              ? 'Public on CharSnap — choose to make private'
              : 'Private on CharSnap — choose to make public'}
            role="menuitemcheckbox"
            aria-checked={isPublic}
            type="button"
          >
            <span className="entry-actions-item-label">Public on CharSnap</span>
            <span className="entry-actions-tick" aria-hidden="true">{isPublic ? '✓' : ''}</span>
          </button>

          <button
            className="entry-actions-item"
            onClick={act(() => onUpdate({ hiddenFromExport: !isHidden }, true))}
            onMouseEnter={leaveSub}
            title="Exclude this entry from JSON export"
            role="menuitemcheckbox"
            aria-checked={isHidden}
            type="button"
          >
            <span className="entry-actions-item-label">Hide from Export</span>
            <span className="entry-actions-tick" aria-hidden="true">{isHidden ? '✓' : ''}</span>
          </button>

          <div className="entry-actions-divider" role="separator" />

          <button
            className="entry-actions-item entry-actions-item--destructive"
            onClick={act(() => onRemove(entry.id))}
            onMouseEnter={leaveSub}
            role="menuitem"
            type="button"
          >
            <span className="entry-actions-item-label">Delete entry</span>
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
