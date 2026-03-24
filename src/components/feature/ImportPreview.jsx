// Read-only preview of parsed lorebook entries before the user confirms the import
import { ENTRY_TYPES } from '../../constants/entry-types.js';

export function ImportPreview({ entries, onConfirm, onCancel }) {
  if (!entries || entries.length === 0) return null;

  return (
    <div className="import-preview">
      <div className="preview-header">
        <strong>Preview</strong> — {entries.length} {entries.length === 1 ? 'entry' : 'entries'} parsed
      </div>
      <div className="preview-list">
        {entries.map((entry, idx) => {
          const typeDef = ENTRY_TYPES.find((t) => t.id === entry.type);
          return (
            <div key={idx} className="preview-item">
              <span
                className="preview-dot"
                style={{ background: typeDef?.color ?? '#9ba1ad' }}
              />
              <span className="preview-name">{entry.name || '(unnamed)'}</span>
              <span className="preview-type">{typeDef?.label ?? entry.type}</span>
              {entry.triggers.length > 0 && (
                <span className="preview-triggers">{entry.triggers.slice(0, 3).join(', ')}{entry.triggers.length > 3 ? '…' : ''}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="preview-actions">
        <button className="import-confirm-btn" onClick={onConfirm}>
          Import {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </button>
        <button className="import-cancel-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
