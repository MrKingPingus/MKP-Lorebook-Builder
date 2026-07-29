// Drag-and-drop file target that also opens the OS file picker on click — emits file via callback.
//
// `inputRef` lets a parent reach the hidden input and click it directly, which
// is how the Import hotkey opens the OS picker without the user first having to
// click the zone. When it isn't passed, the zone keeps its own ref as before.
import { useRef, useState } from 'react';

export function DropZone({ onFile, accept, children, inputRef: externalRef }) {
  const ownRef    = useRef(null);
  const inputRef  = externalRef ?? ownRef;
  const [over, setOver] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  function handleChange(e) {
    const file = e.target.files[0];
    if (file) onFile(file);
    e.target.value = '';
  }

  return (
    <div
      className={`drop-zone${over ? ' drop-zone--over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      {children ?? <span>Drop a file here or tap / click to browse</span>}
    </div>
  );
}
