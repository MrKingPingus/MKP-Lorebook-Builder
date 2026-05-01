// Collapsible Crosstalk row inside the mobile entry detail panel.
// Hidden until ≥1 reference entry overlaps with the active entry by either
// same-name match or shared trigger keywords. Each row taps through to a
// peek overlay of the matching reference entry. Same-name matches are
// pinned to the top.
import { useState } from 'react';
import { useUi }                from '../../hooks/use-ui.js';
import { useCrosstalk }         from '../../hooks/use-crosstalk.js';
import { useNameMatch }         from '../../hooks/use-name-match.js';
import { useReferenceLorebook } from '../../hooks/use-reference-lorebook.js';
import { TypeColorDot }         from '../ui/TypeColorDot.jsx';

export function CrosstalkRow({ entry }) {
  const [open, setOpen] = useState(false);
  const setPeekReferenceEntryId = useUi((s) => s.setPeekReferenceEntryId);
  const { conflictMap }         = useCrosstalk();
  const { referenceLorebook }   = useReferenceLorebook();
  const nameMatchMap            = useNameMatch();

  if (!referenceLorebook) return null;

  const sameNameRefId = nameMatchMap.get(entry.id) ?? null;

  // Reference-side entry ids that share at least one trigger with this entry,
  // plus the set of triggers each reference entry shares.
  const sharedByRef = new Map(); // refEntryId → Set<triggerLower>
  for (const t of entry.triggers) {
    const key = t.toLowerCase();
    const conflicts = conflictMap.get(key);
    if (!conflicts) continue;
    for (const c of conflicts) {
      if (!c.isOtherBook) continue;
      if (!sharedByRef.has(c.id)) sharedByRef.set(c.id, new Set());
      sharedByRef.get(c.id).add(key);
    }
  }

  // Build the ordered list: same-name pinned first, then trigger-shared
  // entries (excluding the same-name one if it's also trigger-shared).
  const ordered = [];
  if (sameNameRefId) {
    ordered.push({ refId: sameNameRefId, sharedTriggers: sharedByRef.get(sameNameRefId) ?? new Set(), isSameName: true });
  }
  for (const [refId, triggers] of sharedByRef) {
    if (refId === sameNameRefId) continue;
    ordered.push({ refId, sharedTriggers: triggers, isSameName: false });
  }

  if (ordered.length === 0) return null;

  return (
    <div className="entry-detail-section crosstalk-row">
      <button
        className="crosstalk-row-toggle"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span className="crosstalk-row-toggle-label">
          Crosstalk <span className="crosstalk-row-count">({ordered.length})</span>
        </span>
        <span className="crosstalk-row-chevron">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="crosstalk-row-list">
          {ordered.map(({ refId, sharedTriggers, isSameName }) => {
            const refEntry = referenceLorebook.entries.find((e) => e.id === refId);
            if (!refEntry) return null;
            const triggerList = [...sharedTriggers];
            return (
              <button
                key={refId}
                className="crosstalk-row-item"
                onClick={() => setPeekReferenceEntryId(refId)}
                type="button"
              >
                <TypeColorDot type={refEntry.type} />
                <span className="crosstalk-row-item-name">{refEntry.name || '(unnamed)'}</span>
                <span className="crosstalk-row-item-tags">
                  {isSameName && (
                    <span className="crosstalk-row-tag crosstalk-row-tag--same-name">same name</span>
                  )}
                  {triggerList.length > 0 && (
                    <span className="crosstalk-row-tag crosstalk-row-tag--trigger">
                      {triggerList.length} trigger{triggerList.length === 1 ? '' : 's'}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
