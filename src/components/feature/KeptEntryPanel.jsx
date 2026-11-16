// Desktop "Keep in view" pane (#137): one entry from the active book, read-only,
// in the second pane beside the editor — the slot a paired reference book uses,
// which it takes over until closed. The card borrows the reference pane's
// read-only card styling; the Highlight Differences toggle is the checkpoint
// panel's, so the same control looks and reads the same everywhere.
import { useKeptEntry }     from '../../hooks/use-kept-entry.js';
import { useSettings }      from '../../hooks/use-settings.js';
import { EntryStatusIcons } from '../ui/EntryStatusIcons.jsx';
import { TypeColorDot }     from '../ui/TypeColorDot.jsx';
import { StatsBadge }       from '../ui/StatsBadge.jsx';
import { ENTRY_TYPES }      from '../../constants/entry-types.js';

export function KeptEntryPanel() {
  const {
    keptEntry: entry, keptIndex, compareWith, compareCandidates, diffOn, differingCount,
    conditionDiffers, descriptionParts, triggerParts, pausedReferenceName,
    setDiffOn, setCompareWithId, close, swap,
  } = useKeptEntry();
  const { hideEntryStats, counterTiers, tieredCounterEnabled, warningScale, markPrivateEntries } = useSettings();

  if (!entry) return null;

  const typeColor = ENTRY_TYPES.find((t) => t.id === entry.type)?.color ?? '#9ba1ad';
  const condition = typeof entry.triggerCondition === 'string' ? entry.triggerCondition.trim() : '';
  const compareName = compareWith?.name || '(unnamed)';

  return (
    <div className="kept-panel" aria-label="Entry kept in view">
      <div className="pane-header kept-panel-header">
        <div className="field-label pane-header-label">IN VIEW</div>
        <span className="kept-panel-name" style={{ color: typeColor }}>{entry.name || '(unnamed)'}</span>
        <div className="kept-panel-actions">
          <button
            className={`rollback-diff-toggle${diffOn ? ' rollback-diff-toggle--on' : ''}`}
            onClick={() => setDiffOn(!diffOn)}
            aria-pressed={diffOn}
            title="Mark the words in this entry that the compared entry doesn't have"
            type="button"
          >
            {diffOn ? '✓ ' : ''}Highlight Differences
          </button>
          <button
            className="card-action-btn"
            onClick={swap}
            disabled={!compareWith}
            title={compareWith
              ? `Edit ${entry.name || 'this entry'} and keep ${compareName} in view instead`
              : 'Open an entry to edit first — Swap trades it with this one'}
            type="button"
          >
            Swap
          </button>
          <button className="card-action-btn" onClick={close} title="Stop keeping this entry in view" type="button">
            Close
          </button>
        </div>
      </div>

      {pausedReferenceName !== null && (
        <div className="kept-panel-note">
          Your reference book, <b>{pausedReferenceName || '(unnamed)'}</b>, comes back when you close this.
        </div>
      )}

      {diffOn && (
        <div className="kept-panel-diffbar">
          <label className="kept-panel-compare">
            Compared with
            <select
              className="kept-panel-select"
              value={compareWith?.id ?? ''}
              onChange={(e) => setCompareWithId(e.target.value || null)}
            >
              {!compareWith && <option value="">Choose an entry…</option>}
              {compareCandidates.map((c) => (
                <option key={c.id} value={c.id}>{c.name || '(unnamed)'}</option>
              ))}
            </select>
          </label>
          {compareWith && (
            <span className="rollback-diff-count">
              {differingCount === 0 ? 'No differences' : `${differingCount} field${differingCount === 1 ? '' : 's'} differ`}
            </span>
          )}
          {compareWith && differingCount > 0 && (
            <span className="kept-panel-legend">
              <span className="diff-seg--add">not in {compareName}</span>
            </span>
          )}
        </div>
      )}

      <div className="kept-panel-body">
        <div className="reference-entry-card kept-entry-card" style={{ '--type-color': typeColor }}>
          <div className="reference-entry-header">
            <TypeColorDot type={entry.type} />
            <span className="reference-entry-label" style={{ color: typeColor }}>
              #{keptIndex}: {entry.name || '(unnamed)'}
            </span>
            <EntryStatusIcons entry={entry} markPrivateEntries={markPrivateEntries} />
            <div className="reference-entry-header-right">
              {!hideEntryStats && (
                <StatsBadge
                  triggerCount={entry.triggers.length}
                  charCount={entry.description.length}
                  counterTiers={counterTiers}
                  tieredEnabled={tieredCounterEnabled}
                  warningScale={warningScale}
                />
              )}
            </div>
          </div>

          {triggerParts.length > 0 && (
            <div className="reference-entry-triggers">
              {triggerParts.map((t, i) => (
                <span
                  key={i}
                  className={diffOn && compareWith
                    ? `diff-trigger ${t.unique ? 'diff-trigger--added' : 'diff-trigger--same'}`
                    : 'reference-entry-trigger'}
                >
                  {t.text}
                </span>
              ))}
            </div>
          )}

          {(condition !== '' || entry.alwaysOn === true) && (
            <div className="reference-entry-condition">
              {conditionDiffers && <span className="diff-modified-dot" title="Differs from the compared entry">●</span>}
              {condition !== '' && (
                <><span className="reference-entry-condition-label">Trigger condition</span> {condition}</>
              )}
              {entry.alwaysOn === true && <span className="reference-entry-always-on">Always on</span>}
            </div>
          )}

          {entry.description !== '' && (
            <div className="reference-entry-description">
              {descriptionParts.map((p, i) => (
                p.unique ? <span key={i} className="diff-seg--add">{p.text}</span> : <span key={i}>{p.text}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
