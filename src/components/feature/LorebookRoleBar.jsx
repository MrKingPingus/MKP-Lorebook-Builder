// Mobile-only consolidated lorebook bar. In crosstalk mode shows two
// segments — left and right slots — each pinned to a specific lorebook.
// The active role's segment is highlighted in blue. Tapping the inactive
// segment swaps roles via swapReference(), which flips ids AND the
// activeSide flag so the books stay pinned to their physical slots while
// the active highlight (and editing target) moves to the tapped side.
//
// Each segment has an icon button to its right. The active segment shows
// ✏️ → inline rename. The reference segment shows ⋯ → small menu (Change
// reference / Browse reference / Unpair). Outside crosstalk renders a
// single solo row with rename + lorebook switcher.
//
// Replaces the previous LOREBOOK NAME / REFERENCE / segmented-control
// stack in BuildPanel — saves four rows of vertical chrome on mobile.
import { useState, useRef, useEffect } from 'react';
import { createPortal }                from 'react-dom';
import { useLorebookStore }            from '../../state/lorebook-store.js';
import { useLorebook }                 from '../../hooks/use-lorebook.js';
import { useReferenceLorebook }        from '../../hooks/use-reference-lorebook.js';
import { useUi }                       from '../../hooks/use-ui.js';
import { useReferenceChooser }         from '../../hooks/use-reference-chooser.js';

export function LorebookRoleBar() {
  const { activeLorebook, renameLorebook } = useLorebook();
  const { referenceLorebook, crosstalkEnabled, setReferenceLorebookId, swapReference } = useReferenceLorebook();
  const setReferenceBrowseOpen = useUi((s) => s.setReferenceBrowseOpen);
  const activeSide             = useUi((s) => s.activeSide);
  const openMobileTitleMenu    = useUi((s) => s.openMobileTitleMenu);
  const { openChooser: openReferenceChooser } = useReferenceChooser();
  const lorebooks              = useLorebookStore((s) => s.lorebooks);

  // Inline rename state
  const [renameOpen,  setRenameOpen]  = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const renameInputRef = useRef(null);

  function openRename() {
    setRenameDraft(activeLorebook?.name ?? '');
    setRenameOpen(true);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }
  function commitRename() {
    const trimmed = renameDraft.trim();
    if (trimmed && trimmed !== activeLorebook?.name) renameLorebook(trimmed);
    setRenameOpen(false);
  }
  function onRenameKey(e) {
    if (e.key === 'Enter')  { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { e.preventDefault(); setRenameOpen(false); }
  }

  // Reference menu state
  const [refMenuOpen,    setRefMenuOpen]    = useState(false);
  const [refMenuAnchor,  setRefMenuAnchor]  = useState(null);
  const refMenuBtnRef = useRef(null);

  function openRefMenu() {
    setRefMenuAnchor(refMenuBtnRef.current?.getBoundingClientRect() ?? null);
    setRefMenuOpen(true);
  }
  // Changing the reference goes to the same chooser as every other pairing
  // route, rather than to a bare list of book names. Whoever is standing here
  // already knows what a reference is, but a second pairing UI that drifts from
  // the first is how #123 happened in the first place.
  function openChangeRef() {
    setRefMenuOpen(false);
    openReferenceChooser();
  }
  function openBrowseRef() {
    setRefMenuOpen(false);
    setReferenceBrowseOpen(true);
  }
  function unpairRef() {
    setRefMenuOpen(false);
    setReferenceLorebookId(null);
  }


  // Close all on Escape — single global handler for whichever popover is up.
  // Only consumes Escape while something is actually open, so an Escape with
  // nothing up still reaches the window dispatcher / dismiss stack.
  useEffect(() => {
    if (!refMenuOpen && !renameOpen) return undefined;
    function onKey(e) {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setRefMenuOpen(false);
      setRenameOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [refMenuOpen, renameOpen]);

  // === Crosstalk + reference paired: two segments pinned to slots ===
  if (crosstalkEnabled && referenceLorebook) {
    // Pin books to physical slots based on activeSide. After swapReference()
    // the ids flip AND activeSide flips, so the same book stays in the same
    // slot and only the highlight (active role) moves.
    const leftIsActive  = activeSide === 'left';
    const leftBookId    = leftIsActive ? activeLorebook?.id : referenceLorebook.id;
    const rightBookId   = leftIsActive ? referenceLorebook.id : activeLorebook?.id;
    const leftBook      = leftBookId  ? lorebooks[leftBookId]  : null;
    const rightBook     = rightBookId ? lorebooks[rightBookId] : null;

    // helpers — render one segment by side
    function renderSegment(side) {
      const isActive = (side === 'left' && leftIsActive) || (side === 'right' && !leftIsActive);
      const book     = side === 'left' ? leftBook : rightBook;
      const role     = isActive ? 'ACTIVE' : 'REFERENCE';

      return (
        <div className={`role-swap-segment${isActive ? ' role-swap-segment--active' : ''}`}>
          {isActive ? (
            <div className="role-swap-segment-content">
              <span className="role-swap-segment-role">{role}</span>
              {renameOpen ? (
                <input
                  ref={renameInputRef}
                  className="role-swap-rename-input"
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={onRenameKey}
                  spellCheck={false}
                />
              ) : (
                // Same door as the solo bar's — the title menu is reachable
                // from the active book's name in both poses, so the route
                // doesn't disappear the moment a reference is paired.
                <button
                  type="button"
                  className="role-swap-segment-name role-swap-segment-name--btn"
                  onClick={() => openMobileTitleMenu()}
                  aria-haspopup="dialog"
                >
                  {book?.name || '(unnamed)'}
                  <span className="lorebook-bar-caret" aria-hidden="true">▼</span>
                </button>
              )}
            </div>
          ) : (
            <button
              className="role-swap-segment-tap"
              onClick={swapReference}
              type="button"
              title={`Swap roles — edit ${book?.name || 'the reference lorebook'}`}
            >
              <span className="role-swap-segment-role">{role}</span>
              <span className="role-swap-segment-name">{book?.name || '(unnamed)'}</span>
            </button>
          )}
          {isActive && !renameOpen && (
            <button
              className="role-swap-segment-action"
              onClick={openRename}
              aria-label="Rename active lorebook"
              title="Rename"
              type="button"
            >
              ✏️
            </button>
          )}
          {!isActive && (
            <button
              ref={refMenuBtnRef}
              className="role-swap-segment-action"
              onClick={openRefMenu}
              aria-label="Reference options"
              title="Reference options"
              type="button"
            >
              ⋯
            </button>
          )}
        </div>
      );
    }

    return (
      <>
        <div className="role-swap-segmented">
          {renderSegment('left')}
          {renderSegment('right')}
        </div>

        {refMenuOpen && createPortal(
          <>
            <div className="popover-backdrop" onClick={() => setRefMenuOpen(false)} />
            <div
              className="role-swap-ref-menu"
              style={{
                position: 'fixed',
                top:  (refMenuAnchor?.bottom ?? 0) + 6,
                left: Math.max(8, Math.min((refMenuAnchor?.left ?? 0) - 140, window.innerWidth - 220)),
              }}
            >
              <button className="role-swap-ref-menu-item" onClick={openChangeRef}  type="button">Change reference…</button>
              <button className="role-swap-ref-menu-item" onClick={openBrowseRef}  type="button">Browse reference</button>
              <button className="role-swap-ref-menu-item role-swap-ref-menu-item--destructive" onClick={unpairRef} type="button">Unpair reference</button>
            </div>
          </>,
          document.body,
        )}
      </>
    );
  }

  // === Solo (no crosstalk or no reference paired) ===
  return (
    <div className="lorebook-bar-solo">
      {renameOpen ? (
        <input
          ref={renameInputRef}
          className="lorebook-bar-rename-input"
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={onRenameKey}
          spellCheck={false}
        />
      ) : (
        // The name is the door to the title menu, which is where every
        // destination a phone previously could not reach now lives. The ▼ rides
        // inside the same button rather than beside it: a name on its own does
        // not read as tappable, and two adjacent controls that both open
        // something about the lorebook is the ambiguity this phase is removing.
        <button
          className="lorebook-bar-title-btn"
          onClick={() => openMobileTitleMenu()}
          type="button"
          aria-haspopup="dialog"
          title="Lorebooks, import and export"
        >
          <span className="lorebook-bar-name">{activeLorebook?.name || '(unnamed)'}</span>
          <span className="lorebook-bar-caret" aria-hidden="true">▼</span>
        </button>
      )}
      {!renameOpen && (
        <button
          className="lorebook-bar-action"
          onClick={openRename}
          aria-label="Rename lorebook"
          title="Rename"
          type="button"
        >
          ✏️
        </button>
      )}
    </div>
  );
}
