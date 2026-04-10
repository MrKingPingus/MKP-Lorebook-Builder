// Floating modal that prompts for a lorebook name immediately after creation
import { useState, useRef, useEffect } from 'react';
import { useUi }       from '../../hooks/use-ui.js';
import { useLorebook } from '../../hooks/use-lorebook.js';

export function LorebookNameModal() {
  const pendingFocusLorebookName    = useUi((s) => s.pendingFocusLorebookName);
  const setPendingFocusLorebookName = useUi((s) => s.setPendingFocusLorebookName);
  const setActiveMenuPanel          = useUi((s) => s.setActiveMenuPanel);
  const activeMenuPanel             = useUi((s) => s.activeMenuPanel);
  const { renameLorebook }          = useLorebook();
  const [localName, setLocalName]   = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (pendingFocusLorebookName) {
      setLocalName('');
      // Defer focus one tick so the element is mounted
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [pendingFocusLorebookName]);

  if (!pendingFocusLorebookName) return null;

  function confirm() {
    const trimmed = localName.trim();
    if (trimmed) renameLorebook(trimmed);
    setPendingFocusLorebookName(false);
  }

  function dismiss() {
    setPendingFocusLorebookName(false);
  }

  function openImport() {
    setPendingFocusLorebookName(false);
    // setActiveMenuPanel toggles, so only open if not already on import-export
    if (activeMenuPanel !== 'import-export') setActiveMenuPanel('import-export');
  }

  function onKeyDown(e) {
    if (e.key === 'Enter')  { e.preventDefault(); confirm(); }
    if (e.key === 'Escape') { dismiss(); }
  }

  return (
    <div
      className="lb-name-modal-overlay"
      onMouseDown={confirm}
    >
      <div
        className="lb-name-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="lb-name-modal-header">
          <span className="lb-name-modal-title">Name your lorebook</span>
          <button
            className="lb-name-modal-close"
            onClick={dismiss}
            title="Skip for now"
          >
            ×
          </button>
        </div>
        <input
          ref={inputRef}
          className="lb-name-modal-input"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Lorebook name…"
          spellCheck={false}
        />
        <p className="lb-name-modal-hint">Press Enter or click outside to confirm</p>
        <div className="lb-name-modal-divider">or</div>
        <button
          className="lb-name-modal-import-btn"
          onClick={openImport}
        >
          ⬇ Import a lorebook instead
        </button>
      </div>
    </div>
  );
}
