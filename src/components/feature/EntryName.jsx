// Auto-sizing name text input for a lorebook entry — expands and contracts to fit text
import { useRef, useEffect } from 'react';

export function EntryName({ value, onChange }) {
  const spanRef  = useRef(null);
  const inputRef = useRef(null);

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
      />
    </span>
  );
}
