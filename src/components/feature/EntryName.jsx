// Auto-sizing name text input for a lorebook entry — expands and contracts to fit text
import { useRef, useEffect } from 'react';
import { useHostMode } from '../../hooks/use-host.js';
import { HOST_LIMITS } from '../../constants/host.js';

export function EntryName({ value, onChange }) {
  const spanRef  = useRef(null);
  const inputRef = useRef(null);
  // Host mode hard-caps typing at CharSnap's limit; standalone stays advisory.
  const hostMode = useHostMode();

  useEffect(() => {
    if (spanRef.current && inputRef.current) {
      spanRef.current.textContent = value || ' ';
      inputRef.current.style.width = `${spanRef.current.offsetWidth + 4}px`;
    }
  }, [value]);

  return (
    <span className="entry-name-wrapper">
      <span ref={spanRef} className="entry-name-sizer" aria-hidden="true" />
      <input
        ref={inputRef}
        className="entry-name-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Entry name…"
        spellCheck={false}
        maxLength={hostMode ? HOST_LIMITS.name : undefined}
      />
    </span>
  );
}
