// Single trigger keyword chip with an editable label (double-click) and a × delete button
import { useState, useRef } from 'react';
import { useHtmlEscape } from '../../hooks/use-html-escape.js';

export function Chip({ label, onDelete, onRename, color, highlight }) {
  const { escapeHtml, escapeRegex } = useHtmlEscape();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(label);
  const inputRef = useRef(null);

  function startEdit() {
    setDraft(label);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== label) onRename?.(trimmed);
    setEditing(false);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter')  commitEdit();
    if (e.key === 'Escape') setEditing(false);
  }

  return (
    <span className="chip" style={color ? { borderColor: color } : {}}>
      {editing ? (
        <input
          ref={inputRef}
          className="chip-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={onKeyDown}
        />
      ) : (
        <span
          className="chip-label"
          onDoubleClick={startEdit}
          {...(highlight
            ? {
                dangerouslySetInnerHTML: {
                  __html: escapeHtml(label).replace(
                    new RegExp(`(${escapeRegex(escapeHtml(highlight))})`, 'gi'),
                    '<mark class="search-mark">$1</mark>'
                  ),
                },
              }
            : {})}
        >
          {highlight ? undefined : label}
        </span>
      )}
      <button className="chip-delete" onClick={onDelete} title="Remove trigger">×</button>
    </span>
  );
}
