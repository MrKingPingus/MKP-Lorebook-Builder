// Drag-and-drop file target that also opens the OS file picker on click — emits file via callback
import { useRef, useState, useEffect } from 'react';

export function DropZone({ onFile, accept, children, autoOpen = false }) {
  const inputRef  = useRef(null);
  const [over, setOver] = useState(false);
  const autoOpened = useRef(false);

  // One-shot: when the caller arrives already committed to picking a file
  // (e.g. the lander "Import File" tile), pop the OS picker immediately. The
  // ref guard keeps a remount from re-triggering it.
  useEffect(() => {
    if (autoOpen && !autoOpened.current) {
      autoOpened.current = true;
      inputRef.current?.click();
    }
  }, [autoOpen]);

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
