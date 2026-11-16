// Mobile "Keep in view" peek (#137): the kept entry, read-only and full-screen
// over the entry editor, reached from KeptEntryBar. Built on the reference
// peek's layout (ReferenceEntryOverlay) so the two read alike. Back returns to
// the editor; Swap edits the kept entry and keeps the one you were editing.
import { useEffect }       from 'react';
import { useKeptEntry }    from '../../hooks/use-kept-entry.js';
import { useDismissLayer } from '../../hooks/use-dismiss-layer.js';
import { TypeColorDot }    from '../ui/TypeColorDot.jsx';
import { ENTRY_TYPES }     from '../../constants/entry-types.js';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';

export function KeptEntryOverlay() {
  const {
    keptEntry: entry, peekOpen, compareWith, diffOn, differingCount, conditionDiffers,
    descriptionParts, triggerParts, setDiffOn, close, swap, closePeek,
  } = useKeptEntry();

  // Drop focus from the editor field underneath, or iOS keeps the keyboard up
  // over a read-only view.
  useEffect(() => {
    if (peekOpen && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, [peekOpen]);

  useDismissLayer('kept-peek', peekOpen, DISMISS_PRIORITY.popover, closePeek);

  if (!peekOpen || !entry) return null;

  const typeDef   = ENTRY_TYPES.find((t) => t.id === entry.type);
  const typeColor = typeDef?.color ?? '#9ba1ad';
  const condition = typeof entry.triggerCondition === 'string' ? entry.triggerCondition.trim() : '';
  const marking   = diffOn && !!compareWith;
  const dot = (changed) => marking && changed && <span className="diff-modified-dot" title="Differs">●</span>;

  return (
    <div className="reference-entry-overlay kept-entry-overlay">
      <div className="reference-entry-overlay-header">
        <button className="reference-entry-overlay-back touch-floor" onClick={closePeek}>← Back</button>
        <span className="reference-entry-overlay-title" style={{ color: typeColor }}>
          {entry.name || '(unnamed)'}
        </span>
      </div>

      {compareWith && (
        <div className="kept-peek-diffbar">
          <button
            className={`rollback-diff-toggle touch-floor${diffOn ? ' rollback-diff-toggle--on' : ''}`}
            onClick={() => setDiffOn(!diffOn)}
            aria-pressed={diffOn}
            type="button"
          >
            {diffOn ? '✓ ' : ''}Highlight Differences
          </button>
          {diffOn && (
            <span className="kept-peek-vs">
              {differingCount === 0
                ? <>No differences from <b>{compareWith.name || '(unnamed)'}</b></>
                : <>Marked: not in <b>{compareWith.name || '(unnamed)'}</b></>}
            </span>
          )}
        </div>
      )}

      <div className="reference-entry-overlay-body">
        <div className="reference-entry-overlay-meta">
          <TypeColorDot type={entry.type} />
          <span style={{ color: typeColor }}>{typeDef?.label ?? entry.type}</span>
        </div>

        {triggerParts.length > 0 && (
          <div className="reference-entry-overlay-section">
            <div className="field-label">TRIGGERS{dot(triggerParts.some((t) => t.unique))}</div>
            <div className="reference-entry-overlay-triggers">
              {triggerParts.map((t, i) => (
                <span
                  key={i}
                  className={marking
                    ? `diff-trigger ${t.unique ? 'diff-trigger--added' : 'diff-trigger--same'}`
                    : 'reference-entry-trigger'}
                >
                  {t.text}
                </span>
              ))}
            </div>
          </div>
        )}

        {(condition !== '' || entry.alwaysOn === true) && (
          <div className="reference-entry-overlay-section">
            <div className="field-label">TRIGGER CONDITION{dot(conditionDiffers)}</div>
            <div className="reference-entry-overlay-description">
              {condition !== '' ? condition : null}
              {entry.alwaysOn === true && <span className="reference-entry-always-on">Always on</span>}
            </div>
          </div>
        )}

        {entry.description !== '' && (
          <div className="reference-entry-overlay-section">
            <div className="field-label">DESCRIPTION{dot(descriptionParts.some((p) => p.unique))}</div>
            <div className="reference-entry-overlay-description">
              {descriptionParts.map((p, i) => (
                p.unique ? <span key={i} className="diff-seg--add">{p.text}</span> : <span key={i}>{p.text}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="reference-entry-overlay-footer">
        <button
          className="reference-entry-overlay-action reference-entry-overlay-action--primary touch-floor"
          onClick={swap}
          disabled={!compareWith}
        >
          Swap
        </button>
        <button className="reference-entry-overlay-action touch-floor" onClick={close}>
          Stop keeping in view
        </button>
      </div>
    </div>
  );
}
