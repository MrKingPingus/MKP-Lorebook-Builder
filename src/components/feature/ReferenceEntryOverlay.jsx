// Mobile read-only peek of a reference entry. Renders as a full-screen
// overlay above the build view (and the entry detail panel when one is
// open). One-deep: opening another peek replaces this one. Two footer
// actions — Copy to active (pulls the entry in) and Visit this entry
// (swaps roles and opens the entry's detail panel).
import { usePeekOverlay } from '../../hooks/use-peek-overlay.js';
import { TypeColorDot }   from '../ui/TypeColorDot.jsx';
import { ENTRY_TYPES }    from '../../constants/entry-types.js';

export function ReferenceEntryOverlay() {
  const { peekEntry, closePeek, copyToActive, visitEntry } = usePeekOverlay();

  if (!peekEntry) return null;

  const typeDef   = ENTRY_TYPES.find((t) => t.id === peekEntry.type);
  const typeColor = typeDef?.color ?? '#9ba1ad';
  const typeLabel = typeDef?.label ?? peekEntry.type;

  return (
    <div className="reference-entry-overlay">
      <div className="reference-entry-overlay-header">
        <button className="reference-entry-overlay-back" onClick={closePeek}>
          ← Back
        </button>
        <span className="reference-entry-overlay-title" style={{ color: typeColor }}>
          {peekEntry.name || '(unnamed)'}
        </span>
      </div>

      <div className="reference-entry-overlay-body">
        <div className="reference-entry-overlay-meta">
          <TypeColorDot type={peekEntry.type} />
          <span style={{ color: typeColor }}>{typeLabel}</span>
        </div>

        {peekEntry.triggers.length > 0 && (
          <div className="reference-entry-overlay-section">
            <div className="field-label">TRIGGERS</div>
            <div className="reference-entry-overlay-triggers">
              {peekEntry.triggers.map((t, i) => (
                <span key={i} className="reference-entry-trigger">{t}</span>
              ))}
            </div>
          </div>
        )}

        {peekEntry.description && (
          <div className="reference-entry-overlay-section">
            <div className="field-label">DESCRIPTION</div>
            <div className="reference-entry-overlay-description">
              {peekEntry.description}
            </div>
          </div>
        )}
      </div>

      <div className="reference-entry-overlay-footer">
        <button
          className="reference-entry-overlay-action reference-entry-overlay-action--primary"
          onClick={copyToActive}
        >
          Copy to active
        </button>
        <button
          className="reference-entry-overlay-action"
          onClick={visitEntry}
        >
          Visit this entry
        </button>
      </div>
    </div>
  );
}
