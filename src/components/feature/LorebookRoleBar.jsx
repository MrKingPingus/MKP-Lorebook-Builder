// Mobile-only consolidated lorebook bar. In crosstalk mode shows two
// segments — left and right slots — each pinned to a specific lorebook.
// The active role's segment is highlighted in blue. Tapping the inactive
// segment swaps roles via swapReference(), which flips ids AND the
// activeSide flag so the books stay pinned to their physical slots while
// the active highlight (and editing target) moves to the tapped side.
//
// **Renders only the paired pose.** 14C moved the solo title into the window
// header, where desktop has always kept it, so this component is now exactly
// the thing a header cannot hold: two books at once. Outside crosstalk it
// returns null and the header carries the title instead.
//
// The active segment's content is the door to the mobile title menu. The
// reference segment keeps a ⋯ menu (Change reference / Browse reference /
// Unpair).
//
// **No rename here, in either pose.** It used to be a ✏️ beside the name. Two
// reasons it went: a button cannot be nested inside a button, and once the name
// itself is the control an inline rename affordance would have to be a div with
// a click handler — worse for keyboards and screen readers. And rename already
// exists in the title menu's per-book ⋯ menu for every book including this one,
// so the pencil was a second route to a place you could already get to. Costs
// two taps on a rare action; buys a row with exactly one meaning.
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
  const { activeLorebook } = useLorebook();
  const { referenceLorebook, crosstalkEnabled, setReferenceLorebookId, swapReference } = useReferenceLorebook();
  const setReferenceBrowseOpen = useUi((s) => s.setReferenceBrowseOpen);
  const activeSide             = useUi((s) => s.activeSide);
  const openMobileTitleMenu    = useUi((s) => s.openMobileTitleMenu);
  const { openChooser: openReferenceChooser } = useReferenceChooser();
  const lorebooks              = useLorebookStore((s) => s.lorebooks);

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


  // Close the reference menu on Escape. Only consumes Escape while the menu is
  // actually open, so an Escape with nothing up still reaches the window
  // dispatcher / dismiss stack.
  useEffect(() => {
    if (!refMenuOpen) return undefined;
    function onKey(e) {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setRefMenuOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [refMenuOpen]);

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
            // The whole segment content is the door, the same shape the solo
            // bar takes — role label and name together, not the name alone.
            //
            // It started as just the name with a `.touch-floor` overlay, and
            // that could not work here: the bar is 44px tall, so a 44px hit
            // region centred on a name sitting in the lower half of it has to
            // escape the bar, and the bar clips. A control that *is* the
            // height it needs beats an overlay reaching for it. The ACTIVE
            // label reads as part of the button because it describes exactly
            // what the button is about.
            //
            // The ellipsis stays on the inner span rather than the button: an
            // element with `overflow: hidden` clips its own ::before, so any
            // future `.touch-floor` here would be silently inert.
            <button
              type="button"
              className="role-swap-segment-content role-swap-segment-content--btn"
              onClick={() => openMobileTitleMenu()}
              aria-haspopup="dialog"
              title="Lorebooks, import and export"
            >
              <span className="role-swap-segment-role">{role}</span>
              <span className="role-swap-segment-name-row">
                <span className="role-swap-segment-name">{book?.name || '(unnamed)'}</span>
                <span className="lorebook-bar-caret" aria-hidden="true">▾</span>
              </span>
            </button>
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
  //
  // Nothing. 14C moved the title into the header, where desktop has always kept
  // it — see WindowHeader. This component now renders only the two-book pose,
  // which is the one thing a header cannot hold.
  return null;
}
