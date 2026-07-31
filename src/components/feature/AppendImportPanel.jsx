// Overlay for the hotbar's Import button.
//
// The three-mode segmented control is gone. It existed because this surface
// could only append, so paste / entries-from-file / whole-book had to be picked
// up front — and even then it carried "open the Import / Export tab" nudges for
// the flows it couldn't do. It now renders the same useImportFlow as the title
// dropdown and the side panel, so every disposition (including backup-first) is
// available here and there is nowhere left to redirect anyone to.
import { useState, useEffect, useRef } from 'react';
import { useImportFlow } from '../../hooks/use-import-flow.js';
import { useUi }         from '../../hooks/use-ui.js';
import { ImportFlow }    from './ImportFlow.jsx';
import { IMPORT_STAGE }  from '../../constants/import-flow.js';

export function AppendImportPanel() {
  const setShowAppendImport = useUi((s) => s.setShowAppendImport);
  const flow = useImportFlow({ onDone: () => setShowAppendImport(false) });

  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Import hotkey: jump straight to the OS file picker. The keydown's transient
  // activation is what keeps the dialog allowed, so the click has to happen in
  // the effect that runs off the same event — not behind a timer.
  const pendingImportPick    = useUi((s) => s.pendingImportPick);
  const setPendingImportPick = useUi((s) => s.setPendingImportPick);
  useEffect(() => {
    if (!pendingImportPick) return;
    setPendingImportPick(false);
    fileInputRef.current?.click();
  }, [pendingImportPick, setPendingImportPick]);

  // A drop anywhere on the panel imports, not just on the zone itself. Once the
  // file is parsed there is nothing left to drop, so the target goes away with
  // the source stage.
  const acceptsDrop = flow.stage === IMPORT_STAGE.source;

  function onDragEnter(e) { e.preventDefault(); if (acceptsDrop) setDragging(true); }
  function onDragOver(e)  { e.preventDefault(); }
  function onDragLeave(e) { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }
  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (!acceptsDrop) return;
    const file = e.dataTransfer.files[0];
    if (file) flow.handleFile(file);
  }

  return (
    <div className="append-import-overlay">
      <div
        className="append-import-panel"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="append-import-header">
          <span className="append-import-title">Import</span>
          <button
            className="append-import-close"
            onClick={flow.cancel}
            title="Close"
            aria-label="Close import"
          >
            ×
          </button>
        </div>

        <ImportFlow flow={flow} fileInputRef={fileInputRef} />

        {dragging && acceptsDrop && (
          <div className="append-drop-overlay">Drop file to import</div>
        )}
      </div>
    </div>
  );
}
