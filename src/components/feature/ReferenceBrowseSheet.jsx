// Mobile read-only browser for the paired reference lorebook. Opens as a
// full-screen sheet from the REFERENCE row in BuildPanel — gives the user a
// way to look at what's in the reference book without swapping it to active.
// Tapping a row opens the existing peek overlay; from there the user can
// copy or visit. Filtering follows the global search/sort state so the same
// query that runs in the active list also filters the reference here.
import { useUi }                  from '../../hooks/use-ui.js';
import { useReferenceLorebook }   from '../../hooks/use-reference-lorebook.js';
import { useDisplayEntries }      from '../../hooks/use-display-entries.js';
import { TypeColorDot }           from '../ui/TypeColorDot.jsx';
import { ENTRY_TYPES }            from '../../constants/entry-types.js';

export function ReferenceBrowseSheet() {
  const open                    = useUi((s) => s.referenceBrowseOpen);
  const setOpen                 = useUi((s) => s.setReferenceBrowseOpen);
  const setPeekReferenceEntryId = useUi((s) => s.setPeekReferenceEntryId);
  const { referenceLorebook }   = useReferenceLorebook();
  const { displayEntries }      = useDisplayEntries(referenceLorebook?.entries ?? [], { isReference: true });

  if (!open) return null;

  function close() { setOpen(false); }
  function tap(id) { setPeekReferenceEntryId(id); }

  return (
    <div className="reference-browse-sheet">
      <div className="reference-browse-sheet-header">
        <button className="reference-browse-sheet-back" onClick={close}>
          ← Back
        </button>
        <span className="reference-browse-sheet-title">
          {referenceLorebook?.name || 'Reference'}
        </span>
      </div>

      <div className="reference-browse-sheet-body">
        {!referenceLorebook ? (
          <div className="reference-browse-sheet-empty">No reference lorebook paired.</div>
        ) : displayEntries.length === 0 ? (
          <div className="reference-browse-sheet-empty">No entries match the current filter.</div>
        ) : (
          displayEntries.map((entry) => {
            const typeDef   = ENTRY_TYPES.find((t) => t.id === entry.type);
            const typeColor = typeDef?.color ?? '#9ba1ad';
            return (
              <button
                key={entry.id}
                className="reference-browse-sheet-row"
                onClick={() => tap(entry.id)}
                type="button"
              >
                <TypeColorDot type={entry.type} />
                <span className="reference-browse-sheet-row-name" style={{ color: typeColor }}>
                  {entry.name || '(unnamed)'}
                </span>
                <span className="reference-browse-sheet-row-meta">
                  {entry.triggers.length} trigger{entry.triggers.length === 1 ? '' : 's'}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
