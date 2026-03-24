// Drag-and-drop file target that also opens the OS file picker on click — emits file via callback
import { useRef, useState } from 'react';

export function DropZone({ onFile, accept, children }) {
  const inputRef  = useRef(null);
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
      {children ?? <span>Drop a file here or click to browse</span>}
    </div>
  );
}
