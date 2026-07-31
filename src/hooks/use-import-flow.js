// The state machine behind every import surface.
//
// source → disposition → preview → committed. Parsing, the four dispositions,
// the backup-before-replace step and the warning list all live here, so a
// surface only has to decide how to draw each stage — not what any of them mean.
import { useState, useCallback } from 'react';
import { useImport }  from './use-import.js';
import { useEntries } from './use-entries.js';
import { useLorebook } from './use-lorebook.js';
import { useExport }  from './use-export.js';
import {
  IMPORT_STAGE,
  IMPORT_SOURCE,
  IMPORT_DISPOSITION,
  PASTED_SOURCE_LABEL,
} from '../constants/import-flow.js';

export function useImportFlow({ onDone } = {}) {
  const [stage, setStage]             = useState(IMPORT_STAGE.source);
  const [source, setSource]           = useState(IMPORT_SOURCE.file);
  const [parsed, setParsed]           = useState(null);
  const [importedName, setImportedName] = useState(null);
  const [sourceLabel, setSourceLabel] = useState('');
  const [warnings, setWarnings]       = useState([]);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [disposition, setDisposition] = useState(null);
  const [backedUp, setBackedUp]       = useState(false);

  const { parseFile, parseTxt }                 = useImport();
  const { entries, replaceEntries }             = useEntries();
  const { activeLorebook, renameLorebook, importAsNewLorebook } = useLorebook();
  const { exportJson, defaultExportFilename }   = useExport();

  const reset = useCallback(() => {
    setStage(IMPORT_STAGE.source);
    setSource(IMPORT_SOURCE.file);
    setParsed(null);
    setImportedName(null);
    setSourceLabel('');
    setWarnings([]);
    setError('');
    setLoading(false);
    setDisposition(null);
    setBackedUp(false);
  }, []);

  // Swapping between the drop zone and the textarea clears any parse state, so
  // a file's warnings can't linger over pasted text (or the reverse).
  function chooseSource(next) {
    setSource(next);
    setParsed(null);
    setImportedName(null);
    setSourceLabel('');
    setWarnings([]);
    setError('');
  }

  async function handleFile(file) {
    setError('');
    setLoading(true);
    try {
      const result = await parseFile(file);
      setParsed(result.entries);
      setImportedName(result.name ?? null);
      setWarnings(result.warnings ?? []);
      setSourceLabel(file.name);
      setStage(IMPORT_STAGE.disposition);
    } catch (e) {
      setError(e.message ?? 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  }

  function handleText(text) {
    setError('');
    try {
      const result = parseTxt(text);
      if (!result.length) {
        setError('No entries found. Check your formatting.');
        return;
      }
      setParsed(result);
      // Pasted text carries no lorebook name, so a replace keeps the current
      // book's name rather than blanking it.
      setImportedName(null);
      setWarnings([]);
      setSourceLabel(PASTED_SOURCE_LABEL);
      setStage(IMPORT_STAGE.disposition);
    } catch (e) {
      setError(e.message ?? 'Failed to parse text.');
    }
  }

  // JSON only, deliberately. TXT is a lossy export — as a pre-overwrite backup
  // it is the wrong artefact, and offering it invites someone to pick it and
  // quietly lose their triggers.
  function backupActiveBook() {
    if (!activeLorebook) return;
    exportJson(activeLorebook, `${defaultExportFilename(activeLorebook.name)}.json`);
    setBackedUp(true);
  }

  function chooseDisposition(id, { backupFirst = false } = {}) {
    if (backupFirst) backupActiveBook();
    setDisposition(id);
    setStage(IMPORT_STAGE.preview);
  }

  // Back out of the preview to the disposition grid. The parse is kept — there
  // is no reason to make someone re-pick the same file to change their mind.
  function backToDisposition() {
    setDisposition(null);
    setBackedUp(false);
    setStage(IMPORT_STAGE.disposition);
  }

  function confirm() {
    if (!parsed) return;
    if (disposition === IMPORT_DISPOSITION.append) {
      replaceEntries([...entries, ...parsed]);
    } else if (disposition === IMPORT_DISPOSITION.asNew) {
      importAsNewLorebook({ entries: parsed, name: importedName });
    } else {
      replaceEntries(parsed);
      if (importedName != null) renameLorebook(importedName);
    }
    reset();
    onDone?.();
  }

  function cancel() {
    reset();
    onDone?.();
  }

  return {
    // state
    stage,
    source,
    parsed,
    importedName,
    sourceLabel,
    warnings,
    error,
    loading,
    disposition,
    backedUp,
    activeName: activeLorebook?.name || '(unnamed)',
    activeCount: entries.length,
    // actions
    chooseSource,
    handleFile,
    handleText,
    chooseDisposition,
    backToDisposition,
    confirm,
    cancel,
    reset,
  };
}
