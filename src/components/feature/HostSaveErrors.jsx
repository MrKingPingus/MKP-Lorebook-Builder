// Banner above the filter bar listing why the last save could not go through —
// either the builder's own pre-flight (services/host-limits.js) or the host's
// mkp:save-rejected. Each row is a button that brings that entry on screen.
import { useHostState } from '../../hooks/use-host.js';
import { useLorebook }  from '../../hooks/use-lorebook.js';

const SHOW_LIMIT = 12;

const FIELD_LABEL = {
  name:        'name',
  triggers:    'triggers',
  description: 'description',
  entryType:   'type',
};

export function HostSaveErrors() {
  const errors        = useHostState((s) => s.saveErrors);
  const setSaveErrors = useHostState((s) => s.setSaveErrors);
  const focusError    = useHostState((s) => s.focusError);
  const { activeLorebook } = useLorebook();

  if (!errors || errors.length === 0) return null;

  const shown  = errors.slice(0, SHOW_LIMIT);
  const hidden = errors.length - shown.length;

  function labelFor(err) {
    if (err.index < 0) return 'Lorebook';
    const entry = activeLorebook?.entries?.[err.index];
    const name  = entry?.name?.trim() || '(unnamed)';
    return `#${err.index + 1} ${name}`;
  }

  return (
    <div className="host-save-errors" role="alert">
      <div className="host-save-errors-head">
        <span className="host-save-errors-title">
          CharSnap can&rsquo;t save this yet
          <span className="host-save-errors-count">
            {errors.length} {errors.length === 1 ? 'problem' : 'problems'}
          </span>
        </span>
        <button
          type="button"
          className="host-save-errors-close"
          onClick={() => setSaveErrors([])}
          aria-label="Dismiss"
          title="Dismiss"
        >
          ×
        </button>
      </div>
      <ul className="host-save-errors-list">
        {shown.map((err, i) => (
          <li key={`${err.index}-${err.field}-${i}`}>
            <button
              type="button"
              className="host-save-errors-item"
              onClick={() => focusError?.(err)}
              disabled={err.index < 0}
              title={err.index < 0 ? 'Fix this in CharSnap' : 'Show this entry'}
            >
              <span className="host-save-errors-where">{labelFor(err)}</span>
              {err.field && <span className="host-save-errors-field">{FIELD_LABEL[err.field] ?? err.field}</span>}
              <span className="host-save-errors-msg">{err.message}</span>
            </button>
          </li>
        ))}
        {hidden > 0 && <li className="host-save-errors-more">…and {hidden} more</li>}
      </ul>
    </div>
  );
}
