// The phone entry editor's ⋯ sheet: copy or move this entry to another
// lorebook, open Templates for it, or delete it.
//
// The phone's counterpart to the desktop card's ⋯ menu. That menu's hover
// flyouts have no room beside them on a phone, so this is a bottom sheet that
// steps through one view at a time instead. Public, Hide from Export and
// Always on are not here: they already have buttons in the editor's footer,
// where their state is visible without opening anything.
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUi }           from '../../hooks/use-ui.js';
import { useDismissLayer } from '../../hooks/use-dismiss-layer.js';
import { useEntryTransfer, TRANSFER_COPY, TRANSFER_MOVE } from '../../hooks/use-entry-transfer.js';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';
import { MAX_LOREBOOKS } from '../../constants/limits.js';

const VIEW_ROOT    = 'root';
const VIEW_PICK    = 'pick';     // choosing a destination lorebook
const VIEW_CONFIRM = 'confirm';  // a move, asking first
const VIEW_RESULT  = 'result';   // a copy landed

export function MobileEntryActionsSheet({ entry, onClose, onDelete, onLeftBook }) {
  const openTemplatesManager = useUi((s) => s.openTemplatesManager);
  const {
    transferTargets, canCreateTarget, transferTo, transferToNewLorebook, goToLorebook, moveWarning,
  } = useEntryTransfer();

  const [view, setView]       = useState(VIEW_ROOT);
  const [mode, setMode]       = useState(TRANSFER_COPY);
  const [naming, setNaming]   = useState(false);
  const [newName, setNewName] = useState('');
  const [pending, setPending] = useState(null);   // the destination a move is waiting on
  const [result, setResult]   = useState(null);
  const nameRef = useRef(null);

  useEffect(() => { if (naming) nameRef.current?.focus(); }, [naming]);

  function back() {
    if (view === VIEW_CONFIRM) { setPending(null); setView(VIEW_PICK); }
    else if (view === VIEW_PICK && naming) { setNaming(false); setNewName(''); }
    else if (view === VIEW_ROOT || view === VIEW_RESULT) onClose();
    else setView(VIEW_ROOT);
  }
  useDismissLayer('mobile-entry-actions', true, DISMISS_PRIORITY.popover, back);

  function startTransfer(nextMode) {
    setMode(nextMode);
    setNaming(false);
    setNewName('');
    setView(VIEW_PICK);
  }

  function run(dest, confirmed) {
    const opts = { confirmed };
    return dest.newName !== undefined
      ? transferToNewLorebook([entry.id], dest.newName, mode, opts)
      : transferTo([entry.id], dest.destId, mode, opts);
  }

  function pick(dest) {
    if (mode === TRANSFER_MOVE) { setPending(dest); setView(VIEW_CONFIRM); return; }
    const done = run(dest, false);
    if (done) { setResult(done); setView(VIEW_RESULT); }
  }

  function confirmMove() {
    const done = run(pending, true);
    setPending(null);
    // The entry has left this book, so the editor showing it has nothing to
    // show. Unlike a copy there is no receipt to stay for.
    if (done) onLeftBook();
    else setView(VIEW_PICK);
  }

  const moving  = mode === TRANSFER_MOVE;
  const warning = pending ? moveWarning(1, pending.destName) : null;

  return createPortal(
    <div className="mea-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mea-sheet" role="dialog" aria-modal="true" aria-label="Entry actions">
        {view === VIEW_ROOT && (
          <>
            <div className="mea-title">{entry.name?.trim() || '(unnamed)'}</div>
            <button type="button" className="mea-item" onClick={() => startTransfer(TRANSFER_COPY)}>Copy to lorebook…</button>
            <button type="button" className="mea-item" onClick={() => startTransfer(TRANSFER_MOVE)}>Move to lorebook…</button>
            <button type="button" className="mea-item" onClick={() => { onClose(); openTemplatesManager(entry.id); }}>Templates…</button>
            <button type="button" className="mea-item mea-item--danger" onClick={onDelete}>Delete entry</button>
            <button type="button" className="mea-item mea-item--quiet" onClick={onClose}>Cancel</button>
          </>
        )}

        {view === VIEW_PICK && (
          <>
            <div className="mea-title">
              <button type="button" className="mea-back touch-floor" onClick={() => setView(VIEW_ROOT)}>‹ Back</button>
              {moving ? 'Move to…' : 'Copy to…'}
            </div>
            {transferTargets.length === 0 && (
              <p className="mea-note">This is your only lorebook. Make another one to {moving ? 'move' : 'copy'} this entry into.</p>
            )}
            {transferTargets.map((t) => (
              <button
                type="button"
                key={t.id}
                className="mea-item mea-item--target"
                onClick={() => pick({ destId: t.id, destName: t.name })}
              >
                <span className="mea-item-name">{t.name || '(unnamed)'}</span>
                <span className="mea-item-count">{t.entryCount}</span>
              </button>
            ))}
            {!naming ? (
              <button
                type="button"
                className="mea-item"
                onClick={() => setNaming(true)}
                disabled={!canCreateTarget}
                title={canCreateTarget ? undefined : `The library is full (${MAX_LOREBOOKS} lorebooks)`}
              >
                ＋ New lorebook…
              </button>
            ) : (
              <div className="mea-name-row">
                <input
                  ref={nameRef}
                  className="mea-name-input"
                  value={newName}
                  placeholder="Name the new lorebook"
                  aria-label="Name the new lorebook"
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') { e.preventDefault(); pick({ newName, destName: newName.trim() }); }
                  }}
                />
                <button type="button" className="mea-go" onClick={() => pick({ newName, destName: newName.trim() })}>
                  {moving ? 'Create & move' : 'Create & copy'}
                </button>
              </div>
            )}
          </>
        )}

        {view === VIEW_CONFIRM && warning && (
          <>
            <div className="mea-title">{warning.question}</div>
            <p className="mea-note">{warning.note}</p>
            <button type="button" className="mea-item mea-item--move" onClick={confirmMove}>Move</button>
            <button type="button" className="mea-item mea-item--quiet" onClick={back}>Cancel</button>
          </>
        )}

        {view === VIEW_RESULT && result && (
          <>
            <div className="mea-title mea-result">Copied to “{result.destName || '(unnamed)'}”</div>
            <button type="button" className="mea-item" onClick={() => { onClose(); onLeftBook(); goToLorebook(result.destId); }}>
              Open that lorebook
            </button>
            <button type="button" className="mea-item mea-item--quiet" onClick={onClose}>Done</button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
