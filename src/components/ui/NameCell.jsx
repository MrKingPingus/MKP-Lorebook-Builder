// A name you edit in place: commits on blur or Enter, reverts on Escape, and
// refuses to commit an empty name.
import { useState, useEffect } from 'react';

export function NameCell({ value, onCommit, ariaLabel, title, maxLength, className = '' }) {
  const [draft, setDraft]     = useState(value);
  const [editing, setEditing] = useState(false);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  function commit() {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== value) onCommit(name);
    else setDraft(value);
  }

  return (
    <input
      className={`tpl-settings-name${className ? ` ${className}` : ''}`}
      value={draft}
      maxLength={maxLength}
      aria-label={ariaLabel}
      title={title}
      onFocus={() => setEditing(true)}
      onChange={(e) => { setEditing(true); setDraft(e.target.value); }}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter')  { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === 'Escape') { e.preventDefault(); setEditing(false); setDraft(value); e.currentTarget.blur(); }
      }}
    />
  );
}
