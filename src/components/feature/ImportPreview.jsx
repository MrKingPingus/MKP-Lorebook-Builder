// Read-only preview of parsed lorebook entries before the user confirms the import
import { ENTRY_TYPES } from '../../constants/entry-types.js';

export function ImportPreview({ entries, onConfirm, onCancel, replaceMode = false }) {
  if (!entries || entries.length === 0) return null;

  return (
    <div className="import-preview">
      <div className="preview-header">
        <strong>Preview</strong> — {entries.length} {entries.length === 1 ? 'entry' : 'entries'} parsed
      </div>
      <div className="preview-list">
        {entries.map((entry, idx) => {
          const typeDef = ENTRY_TYPES.find((t) => t.id === entry.type);
          const triggerCount = entry.triggers.length;
          const charCount = entry.description.length;
          return (
            <div key={idx} className="preview-item">
              <span
                className="preview-dot"
                style={{ background: typeDef?.color ?? '#9ba1ad' }}
              />
              <span className="preview-name">{entry.name || '(unnamed)'}</span>
              <span className="preview-type">{typeDef?.label ?? entry.type}</span>
              {triggerCount > 0 && (
                <span className="preview-triggers">{triggerCount} {triggerCount === 1 ? 'trigger' : 'triggers'}</span>
              )}
              {charCount > 0 && (
                <span className="preview-triggers">{charCount} chars</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="preview-actions">
        {replaceMode && (
          <div className="preview-replace-note">⚠ This will replace all current entries.</div>
        )}
        <button className="import-confirm-btn" onClick={onConfirm}>
          {replaceMode ? 'Load' : 'Import'} {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </button>
        <button className="import-cancel-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
