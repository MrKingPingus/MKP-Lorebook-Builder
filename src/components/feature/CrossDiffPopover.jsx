// Centered modal-style overlay that compares an active entry to its
// same-named counterpart in the paired reference book. Diff direction is
// reference → active ("what changed when porting from old book to new
// book"). Includes per-side jump buttons so the user can scroll either
// pane to the matching entry without dismissing the overlay first.
//
// Anchor is ui-store.crossDiffActiveId (the active-side entry id). The
// reference counterpart is resolved via use-name-match.
import { createPortal }            from 'react-dom';
import { useEffect }               from 'react';
import { useUi }                   from '../../hooks/use-ui.js';
import { useEntries }              from '../../hooks/use-entries.js';
import { useNameMatch }            from '../../hooks/use-name-match.js';
import { useReferenceLorebook }    from '../../hooks/use-reference-lorebook.js';
import { ENTRY_TYPES }             from '../../constants/entry-types.js';
import { diffEntries }             from '../../services/diff-service.js';

export function CrossDiffPopover() {
  const crossDiffActiveId    = useUi((s) => s.crossDiffActiveId);
  const setCrossDiffActiveId = useUi((s) => s.setCrossDiffActiveId);
  const setCrossFlashId      = useUi((s) => s.setCrossFlashId);
  const { entries }              = useEntries();
  const { referenceLorebook }    = useReferenceLorebook();
  const { activeToRef, matchedRefByActive } = useNameMatch();

  const isOpen = crossDiffActiveId != null;

  // Esc closes — single keydown handler tied to open state
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') setCrossDiffActiveId(null);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, setCrossDiffActiveId]);

  if (!isOpen) return null;

  const activeEntry = entries.find((e) => e.id === crossDiffActiveId) ?? null;
  const refId       = activeToRef.get(crossDiffActiveId) ?? null;
  const refEntry    = matchedRefByActive.get(crossDiffActiveId) ?? null;

  // Defensive close — popover is open against an entry that has since lost
  // its match (e.g. user just renamed it).
  if (!activeEntry || !refEntry) {
    setCrossDiffActiveId(null);
    return null;
  }

  // Direction: reference (before) → active (after). Reads naturally as
  // "what's different in the active book vs. the reference book."
  const delta            = diffEntries(refEntry, activeEntry);
  const changedCount     = delta.changedFields.size;
  const isFieldChanged   = (name) => delta.changedFields.has(name);
  const refTypeDef       = ENTRY_TYPES.find((t) => t.id === refEntry.type);
  const activeTypeDef    = ENTRY_TYPES.find((t) => t.id === activeEntry.type);

  function close() { setCrossDiffActiveId(null); }

  function flashAndScroll(domId, flashId) {
    setCrossFlashId(flashId);
    requestAnimationFrame(() => {
      document.getElementById(domId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    setTimeout(() => {
      if (useUi.getState().crossFlashId === flashId) setCrossFlashId(null);
    }, 1400);
  }

  function jumpToActive() {
    flashAndScroll(`entry-${activeEntry.id}`, activeEntry.id);
    close();
  }
  function jumpToReference() {
    flashAndScroll(`ref-entry-${refId}`, refId);
    close();
  }

  return createPortal(
    <>
      <div className="cross-diff-backdrop" onClick={close} />
      <div className="cross-diff-popover" role="dialog" aria-label="Compare entries">
        <div className="cross-diff-header">
          <div className="cross-diff-header-titles">
            <span className="cross-diff-title">Compare entries</span>
            <span className="cross-diff-subtitle">
              <strong>{activeEntry.name || '(unnamed)'}</strong>
              {' '}— reference → active
            </span>
          </div>
          <span className="cross-diff-count">
            {changedCount === 0
              ? 'Identical'
              : `${changedCount} field${changedCount === 1 ? '' : 's'} differ`}
          </span>
          <button className="cross-diff-close-btn" onClick={close} aria-label="Close" type="button">×</button>
        </div>

        <div className="cross-diff-body">
          {/* Name */}
          <div className="cross-diff-row">
            <span className="cross-diff-label">
              {isFieldChanged('name') && <span className="diff-modified-dot" title="Differs">●</span>}
              Name
            </span>
            {isFieldChanged('name') ? (
              <span className="cross-diff-value">
                <span className="diff-seg diff-seg--del">{delta.name.before || '(unnamed)'}</span>
                {' → '}
                <span className="diff-seg diff-seg--add">{delta.name.after || '(unnamed)'}</span>
              </span>
            ) : (
              <span className="cross-diff-value">{activeEntry.name || '(unnamed)'}</span>
            )}
          </div>

          {/* Type */}
          <div className="cross-diff-row">
            <span className="cross-diff-label">
              {isFieldChanged('type') && <span className="diff-modified-dot" title="Differs">●</span>}
              Type
            </span>
            {isFieldChanged('type') ? (
              <span className="cross-diff-value">
                <span className="diff-seg diff-seg--del" style={{ color: refTypeDef?.color ?? 'inherit' }}>
                  {refTypeDef?.label ?? refEntry.type}
                </span>
                {' → '}
                <span className="diff-seg diff-seg--add" style={{ color: activeTypeDef?.color ?? 'inherit' }}>
                  {activeTypeDef?.label ?? activeEntry.type}
                </span>
              </span>
            ) : (
              <span className="cross-diff-value" style={{ color: activeTypeDef?.color ?? 'inherit' }}>
                {activeTypeDef?.label ?? activeEntry.type}
              </span>
            )}
          </div>

          {/* Triggers */}
          <div className="cross-diff-row">
            <span className="cross-diff-label">
              {isFieldChanged('triggers') && <span className="diff-modified-dot" title="Differs">●</span>}
              Triggers
            </span>
            <span className="cross-diff-value">
              <span className="diff-trigger-row">
                {delta.triggers.common.map((t) => (
                  <span key={`c-${t}`} className="diff-trigger diff-trigger--same">{t}</span>
                ))}
                {delta.triggers.removed.map((t) => (
                  <span key={`r-${t}`} className="diff-trigger diff-trigger--removed" title="Only in reference">{t}</span>
                ))}
                {delta.triggers.added.map((t) => (
                  <span key={`a-${t}`} className="diff-trigger diff-trigger--added" title="Only in active">{t}</span>
                ))}
                {delta.triggers.common.length + delta.triggers.added.length + delta.triggers.removed.length === 0 && (
                  <span className="diff-trigger diff-trigger--empty">(none on either side)</span>
                )}
              </span>
            </span>
          </div>

          {/* Description */}
          <div className="cross-diff-row cross-diff-row--desc">
            <span className="cross-diff-label">
              {isFieldChanged('description') && <span className="diff-modified-dot" title="Differs">●</span>}
              Description
            </span>
            <div className="cross-diff-description">
              {!isFieldChanged('description') ? (
                activeEntry.description || '(empty)'
              ) : (
                delta.description.segments.map((seg, i) => (
                  <span key={i} className={`diff-seg diff-seg--${seg.kind}`}>{seg.text}</span>
                ))
              )}
            </div>
          </div>

          {referenceLorebook && (
            <div className="cross-diff-meta">
              Reference book: <strong>{referenceLorebook.name || '(unnamed)'}</strong>
            </div>
          )}
        </div>

        <div className="cross-diff-actions">
          <button className="cross-diff-action-btn" onClick={jumpToReference} type="button">
            Jump to reference entry
          </button>
          <button className="cross-diff-action-btn" onClick={jumpToActive} type="button">
            Jump to active entry
          </button>
          <button className="cross-diff-action-btn cross-diff-action-btn--close" onClick={close} type="button">
            Close
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
