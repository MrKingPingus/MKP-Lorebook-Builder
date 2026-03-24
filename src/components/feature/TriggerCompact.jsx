// Single text field trigger mode — comma or semicolon delimited with a delimiter switcher button
import { useState } from 'react';

export function TriggerCompact({ triggers, onUpdate }) {
  const [delimiter, setDelimiter] = useState(',');

  const text = triggers.join(`${delimiter} `);

  function onChange(e) {
    const parts = e.target.value
      .split(delimiter === ',' ? /,/ : /;/)
      .map((s) => s.trim())
      .filter(Boolean);
    onUpdate(parts);
  }

  function toggleDelimiter() {
    setDelimiter((d) => (d === ',' ? ';' : ','));
  }

  return (
    <div className="trigger-compact">
      <textarea
        className="trigger-compact-input"
        value={text}
        onChange={onChange}
        placeholder="Triggers (comma-separated)…"
        rows={2}
      />
      <button
        className="delimiter-btn"
        onClick={toggleDelimiter}
        title="Switch delimiter"
      >
        {delimiter === ',' ? 'CSV' : 'SSV'}
      </button>
    </div>
  );
}
