// Mobile-only consolidated lorebook bar. In crosstalk mode shows two
// segments — ACTIVE | REFERENCE — each labeled with its role and the
// lorebook name. Tap the inactive segment to swap roles. ✏️ on the active
// segment opens an inline rename. ⋯ on the reference segment opens a small
// menu (Change reference / Browse reference / Unpair).
//
// Outside crosstalk (or when no reference is paired) the bar collapses to
// a single row with rename + lorebook switcher.
//
// Replaces the previous LOREBOOK NAME / REFERENCE / segmented-control stack
// in BuildPanel — saves four rows of vertical chrome on mobile.
import { useState, useRef, useEffect } from 'react';
import { createPortal }                from 'react-dom';
import { useLorebook }                 from '../../hooks/use-lorebook.js';
import { useReferenceLorebook }        from '../../hooks/use-reference-lorebook.js';
import { useUi }                       from '../../hooks/use-ui.js';
import { LorebookSwitchPopover }       from './LorebookSwitchPopover.jsx';

export function LorebookRoleBar() {
  const { activeLorebook, renameLorebook } = useLorebook();
  const { referenceLorebook, crosstalkEnabled, setReferenceLorebookId, swapReference } = useReferenceLorebook();
  const setReferenceBrowseOpen = useUi((s) => s.setReferenceBrowseOpen);

  // Inline rename — used by both layouts
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

  // Reference menu (crosstalk variant only)
  const [refMenuOpen,    setRefMenuOpen]    = useState(false);
  const [refMenuAnchor,  setRefMenuAnchor]  = useState(null);
  const [refSwitchOpen,  setRefSwitchOpen]  = useState(false);
  const [refSwitchAnchor, setRefSwitchAnchor] = useState(null);
  const refMenuBtnRef = useRef(null);

  function toggleRefMenu(e) {
    e.stopPropagation();
    if (refMenuOpen) { setRefMenuOpen(false); return; }
    setRefMenuAnchor(refMenuBtnRef.current?.getBoundingClientRect() ?? null);
    setRefMenuOpen(true);
  }
  useEffect(() => {
    if (!refMenuOpen) return;
    function onDoc() { setRefMenuOpen(false); }
    const id = setTimeout(() => document.addEventListener('click', onDoc), 0);
    return () => { clearTimeout(id); document.removeEventListener('click', onDoc); };
  }, [refMenuOpen]);

  function openChangeRef() {
    setRefMenuOpen(false);
    setRefSwitchAnchor(refMenuBtnRef.current?.getBoundingClientRect() ?? null);
    setRefSwitchOpen(true);
  }
  function openBrowseRef() {
    setRefMenuOpen(false);
    setReferenceBrowseOpen(true);
  }
  function unpairRef() {
    setRefMenuOpen(false);
    setReferenceLorebookId(null);
  }

  // Solo lorebook switcher (non-crosstalk variant only)
  const [switchOpen,   setSwitchOpen]   = useState(false);
  const [switchAnchor, setSwitchAnchor] = useState(null);
  const switchBtnRef = useRef(null);
  function toggleSwitch() {
    if (switchOpen) { setSwitchOpen(false); return; }
    setSwitchAnchor(switchBtnRef.current?.getBoundingClientRect() ?? null);
    setSwitchOpen(true);
  }

  // === Crosstalk + reference paired ===
  if (crosstalkEnabled && referenceLorebook) {
    return (
      <>
        <div className="role-swap-segmented">
          {/* ACTIVE — div, not button, since it can host a nested rename ✏️ button */}
          <div className="role-swap-segment role-swap-segment--active" aria-pressed="true">
            <div className="role-swap-segment-content">
              <span className="role-swap-segment-role">ACTIVE</span>
              {renameOpen ? (
                <input
                  ref={renameInputRef}
                  className="role-swap-rename-input"
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={onRenameKey}
                  onClick={(e) => e.stopPropagation()}
                  spellCheck={false}
                />
              ) : (
                <span className="role-swap-segment-name">{activeLorebook?.name || '(unnamed)'}</span>
              )}
            </div>
            {!renameOpen && (
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
          </div>

          {/* REFERENCE — div tappable to swap, ⋯ as a sibling that stops propagation */}
          <div
            className="role-swap-segment"
            role="button"
            tabIndex={0}
            onClick={swapReference}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); swapReference(); } }}
            aria-pressed="false"
            title={`Swap roles — edit ${referenceLorebook.name || 'the reference lorebook'}`}
          >
            <div className="role-swap-segment-content">
              <span className="role-swap-segment-role">REFERENCE</span>
              <span className="role-swap-segment-name">{referenceLorebook.name || '(unnamed)'}</span>
            </div>
            <button
              ref={refMenuBtnRef}
              className="role-swap-segment-action"
              onClick={toggleRefMenu}
              aria-label="Reference options"
              title="Reference options"
              type="button"
            >
              ⋯
            </button>
          </div>
        </div>

        {refMenuOpen && createPortal(
          <div
            className="role-swap-ref-menu"
            style={{
              position: 'fixed',
              top:  (refMenuAnchor?.bottom ?? 0) + 6,
              left: Math.max(8, Math.min((refMenuAnchor?.left ?? 0) - 140, window.innerWidth - 220)),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="role-swap-ref-menu-item" onClick={openChangeRef}  type="button">Change reference…</button>
            <button className="role-swap-ref-menu-item" onClick={openBrowseRef}  type="button">Browse reference</button>
            <button className="role-swap-ref-menu-item role-swap-ref-menu-item--destructive" onClick={unpairRef} type="button">Unpair reference</button>
          </div>,
          document.body,
        )}
        {refSwitchOpen && (
          <LorebookSwitchPopover
            anchorRect={refSwitchAnchor}
            onClose={() => setRefSwitchOpen(false)}
            onPick={(id) => setReferenceLorebookId(id)}
            title="Reference lorebook…"
          />
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
        <span className="lorebook-bar-name">{activeLorebook?.name || '(unnamed)'}</span>
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
      <button
        ref={switchBtnRef}
        className="lorebook-bar-action"
        onClick={toggleSwitch}
        aria-label="Switch lorebook"
        title="Switch lorebook"
        type="button"
      >
        ▼
      </button>
      {switchOpen && (
        <LorebookSwitchPopover
          anchorRect={switchAnchor}
          onClose={() => setSwitchOpen(false)}
          excludeIds={referenceLorebook ? [referenceLorebook.id] : []}
        />
      )}
    </div>
  );
}
