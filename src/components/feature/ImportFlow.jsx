// The one import UI, rendered by all three import surfaces.
//
// Three stages. `source` is drawn inline wherever the surface wants it; the
// `disposition` and `preview` stages take over their surface, because deciding
// what happens to the current book is not something to do beside other controls.
//
// Surfaces pass a flow from useImportFlow rather than owning one, so a surface
// that wraps the flow in its own chrome (the title dropdown's rail, the append
// overlay's header) can react to the stage it's showing.
import { useState } from 'react';
import { DropZone }     from '../ui/DropZone.jsx';
import { ImportPreview } from './ImportPreview.jsx';
import {
  IMPORT_STAGE,
  IMPORT_SOURCE,
  IMPORT_DISPOSITION,
  IMPORT_DISPOSITION_OPTIONS,
  IMPORT_ACCEPT,
  IMPORT_BACKUP_NOTE,
} from '../../constants/import-flow.js';

/** Stage 1 — a drop zone, with paste tucked behind a link beside it. */
function SourceStage({ flow, fileInputRef }) {
  const [text, setText] = useState('');
  const pasting = flow.source === IMPORT_SOURCE.paste;

  return (
    <div className="import-flow-source">
      {pasting ? (
        <>
          <textarea
            className="import-flow-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Name: Ashfall Keep\nTriggers: keep, fortress\nDescription: …'}
            spellCheck={false}
            rows={6}
          />
          <div className="import-flow-source-actions">
            <button
              type="button"
              className="import-flow-parse-btn"
              onClick={() => flow.handleText(text)}
              disabled={!text.trim()}
            >
              Parse entries
            </button>
            <button
              type="button"
              className="import-flow-swap"
              onClick={() => { setText(''); flow.chooseSource(IMPORT_SOURCE.file); }}
            >
              or import a file
            </button>
          </div>
        </>
      ) : (
        <>
          <DropZone onFile={flow.handleFile} accept={IMPORT_ACCEPT} inputRef={fileInputRef}>
            <div className="drop-zone-content">
              {flow.loading ? '⏳ Parsing…' : 'Drop a file or click to browse'}
              <span className="import-flow-formats">TXT · DOCX · ODT · JSON</span>
            </div>
          </DropZone>
          {/* Pasting is the niche path, so it sits behind a link rather than
              taking half the surface with a segmented control. */}
          <button
            type="button"
            className="import-flow-swap"
            onClick={() => flow.chooseSource(IMPORT_SOURCE.paste)}
          >
            or paste entries instead
          </button>
        </>
      )}
      {flow.error && <div className="import-error">{flow.error}</div>}
    </div>
  );
}

/** Stage 2 — what should happen to the book that's already open. */
function DispositionStage({ flow }) {
  return (
    <>
      <div className="import-flow-head">
        <span className="import-flow-title">{flow.sourceLabel}</span>
        <span className="import-flow-sub">
          {flow.parsed.length} {flow.parsed.length === 1 ? 'entry' : 'entries'} parsed
        </span>
      </div>

      {flow.warnings.length > 0 && (
        <div className="import-flow-warn">
          ⚠ {flow.warnings.length} {flow.warnings.length === 1 ? 'entry' : 'entries'} imported
          with missing fields
          <ul className="import-flow-warn-list">
            {flow.warnings.map((w) => (
              <li key={w.index}>Entry #{w.index + 1}: blank {w.fields.join(' and ')}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="import-flow-question">
        What should happen to &ldquo;{flow.activeName}&rdquo;?
      </div>

      <div className="import-flow-grid">
        {IMPORT_DISPOSITION_OPTIONS.map((opt) => (
          <button
            key={`${opt.id}-${opt.backupFirst}`}
            type="button"
            className={`import-flow-opt${opt.danger ? ' import-flow-opt--danger' : ''}`}
            onClick={() => flow.chooseDisposition(opt.id, { backupFirst: opt.backupFirst })}
          >
            <span className="import-flow-opt-title">{opt.title}</span>
            <span className="import-flow-opt-hint">
              {opt.danger
                ? `Overwrites all ${flow.activeCount} ${flow.activeCount === 1 ? 'entry' : 'entries'}`
                : opt.hint}
            </span>
          </button>
        ))}
      </div>

      <div className="import-flow-note">
        <span className="import-flow-note-rule" />
        <span>{IMPORT_BACKUP_NOTE}</span>
        <span className="import-flow-note-rule" />
      </div>

      <div className="import-flow-actions">
        <button type="button" className="import-flow-cancel" onClick={flow.cancel}>
          Cancel
        </button>
      </div>
    </>
  );
}

/** Stage 3 — the entries that are about to land, and what they'll do. */
function PreviewStage({ flow }) {
  const replacing = flow.disposition === IMPORT_DISPOSITION.replace;

  return (
    <>
      <div className="import-flow-head">
        <span className="import-flow-title">{flow.sourceLabel}</span>
        <span className="import-flow-sub">
          {flow.parsed.length} {flow.parsed.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {flow.backedUp && (
        <div className="import-flow-backed-up">✓ Backup downloaded.</div>
      )}

      <div className="import-flow-banner">
        {replacing && <>Will <strong>replace</strong> &ldquo;{flow.activeName}&rdquo; with these entries.</>}
        {flow.disposition === IMPORT_DISPOSITION.append
          && <>Will <strong>append</strong> these entries to &ldquo;{flow.activeName}&rdquo;.</>}
        {flow.disposition === IMPORT_DISPOSITION.asNew
          && <>Will <strong>create a new lorebook</strong> with these entries.</>}
      </div>

      <ImportPreview entries={flow.parsed} hideActions />

      <div className="import-flow-actions">
        <button type="button" className="import-flow-cancel" onClick={flow.backToDisposition}>
          Back
        </button>
        <button
          type="button"
          className={`import-flow-confirm${replacing ? ' import-flow-confirm--danger' : ''}`}
          onClick={flow.confirm}
        >
          {/* "Replace 29 entries" reads as though 29 are being deleted. The
              count is what's arriving, in both cases — so say so. */}
          {replacing ? 'Replace with' : 'Import'} {flow.parsed.length}{' '}
          {flow.parsed.length === 1 ? 'entry' : 'entries'}
        </button>
      </div>
    </>
  );
}

export function ImportFlow({ flow, fileInputRef }) {
  if (flow.stage === IMPORT_STAGE.source) {
    return <SourceStage flow={flow} fileInputRef={fileInputRef} />;
  }
  if (flow.stage === IMPORT_STAGE.disposition) return <DispositionStage flow={flow} />;
  return <PreviewStage flow={flow} />;
}
