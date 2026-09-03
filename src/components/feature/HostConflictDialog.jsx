// Modal for the three moments host mode has to ask rather than guess:
//
//   load          — the local draft has unsaved edits AND CharSnap has a newer copy
//   load-pending  — CharSnap opened a new book, but an unsaved draft of one exists
//   save          — CharSnap refused the save because someone saved in between
//
// Same overlay pattern as LorebookNameModal; rendered at the app root so it
// sits over everything, including the mobile detail panel.
import { useHostState } from '../../hooks/use-host.js';

function when(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

export function HostConflictDialog() {
  const conflict        = useHostState((s) => s.conflict);
  const resolveConflict = useHostState((s) => s.resolveConflict);

  if (!conflict || !resolveConflict) return null;

  const pick = (choice) => () => resolveConflict(choice);
  const name = conflict.name?.trim() || '(unnamed)';

  let title;
  let body;
  let actions;

  if (conflict.kind === 'load') {
    const stamp = when(conflict.updatedAt);
    title = 'This lorebook changed on CharSnap';
    body = (
      <>
        You have unsaved edits to <strong>{name}</strong> in this browser, and CharSnap has a
        newer copy{stamp ? ` (saved ${stamp})` : ''}. Which one do you want to keep working on?
      </>
    );
    actions = (
      <>
        <button type="button" className="host-conflict-btn host-conflict-btn--primary" onClick={pick('resume')}>
          Resume my draft
        </button>
        <button type="button" className="host-conflict-btn host-conflict-btn--danger" onClick={pick('use-host')}>
          Use CharSnap&rsquo;s version
        </button>
      </>
    );
  } else if (conflict.kind === 'load-pending') {
    title = 'Continue an unsaved draft?';
    body = (
      <>
        A new lorebook <strong>{name}</strong> ({conflict.count} {conflict.count === 1 ? 'entry' : 'entries'})
        was started here but never saved to CharSnap.
      </>
    );
    actions = (
      <>
        <button type="button" className="host-conflict-btn host-conflict-btn--primary" onClick={pick('resume')}>
          Resume draft
        </button>
        <button type="button" className="host-conflict-btn host-conflict-btn--danger" onClick={pick('discard')}>
          Discard it and start fresh
        </button>
      </>
    );
  } else {
    title = 'Saved elsewhere';
    body = (
      <>
        CharSnap has a newer copy of this lorebook than the one you loaded
        {conflict.message ? <> — <em>{conflict.message}</em></> : null}.
        Overwrite it with what is here, or fetch CharSnap&rsquo;s copy first and choose which to keep.
      </>
    );
    actions = (
      <>
        <button type="button" className="host-conflict-btn host-conflict-btn--danger" onClick={pick('overwrite')}>
          Overwrite CharSnap
        </button>
        <button type="button" className="host-conflict-btn" onClick={pick('reload')}>
          Reload from CharSnap
        </button>
        <button type="button" className="host-conflict-btn host-conflict-btn--quiet" onClick={pick('cancel')}>
          Keep editing
        </button>
      </>
    );
  }

  return (
    <div className="host-conflict-overlay" role="presentation">
      <div
        className={`host-conflict host-conflict--${conflict.kind}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="host-conflict-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="host-conflict-title" id="host-conflict-title">{title}</div>
        <p className="host-conflict-body">{body}</p>
        <div className="host-conflict-actions">{actions}</div>
      </div>
    </div>
  );
}
