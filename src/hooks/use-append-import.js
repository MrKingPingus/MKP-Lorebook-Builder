// Hook for the footer "Import Entries" overlay — parses a file or pasted text and commits it
// in one of three modes (segmented control in the popup):
//   - 'paste'      : entries from a pasted block, appended to the active book
//   - 'file-entries': entries from a parsed file, appended to the active book
//   - 'file-book'  : a whole lorebook file, parsed and committed via Replace / Import as New
import { useState } from 'react';
import { useImport }        from './use-import.js';
import { useEntries }       from './use-entries.js';
import { useLorebook }      from './use-lorebook.js';
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore }  from '../state/history-store.js';
import { useUiStore }       from '../state/ui-store.js';

export function useAppendImport() {
  const [preview, setPreview]             = useState(null);
  const [importedName, setImportedName]   = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  const { entries, replaceEntries }       = useEntries();
  const { renameLorebook, importAsNewLorebook } = useLorebook();
  const { parseFile, parseTxt }           = useImport();
  const updateActiveEntries  = useLorebookStore((s) => s.updateActiveEntries);
  const pushSnapshot         = useHistoryStore((s) => s.pushSnapshot);
  const setShowAppendImport  = useUiStore((s) => s.setShowAppendImport);
  const setActiveMenuPanel   = useUiStore((s) => s.setActiveMenuPanel);

  function handleText(text) {
    setError('');
    setPreview(null);
    setImportedName(null);
    try {
      const parsed = parseTxt(text);
      if (!parsed.length) { setError('No entries found. Check your formatting.'); return; }
      setPreview(parsed);
    } catch (e) {
      setError(e.message ?? 'Failed to parse text.');
    }
  }

  async function handleFile(file) {
    setError('');
    setPreview(null);
    setImportedName(null);
    setLoading(true);
    try {
      const result = await parseFile(file);
      setPreview(result.entries);
      if (result.name != null) setImportedName(result.name);
    } catch (e) {
      setError(e.message ?? 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  }

  // Append parsed preview to the active book — used by both paste and entries-file modes.
  function confirmAppend() {
    if (!preview) return;
    pushSnapshot({ entries: [...entries] });
    updateActiveEntries([...entries, ...preview]);
    resetAndClose();
  }

  // Replace the active book with the imported entries (and name when present) —
  // used by the file-book mode.
  function confirmReplace() {
    if (!preview) return;
    replaceEntries(preview);
    if (importedName != null) renameLorebook(importedName);
    resetAndClose();
  }

  // Create a new lorebook and load the imported content into it. Discards the
  // bootstrap placeholder on first-run (via use-lorebook's importAsNewLorebook).
  function confirmAsNew() {
    if (!preview) return;
    importAsNewLorebook({ entries: preview, name: importedName });
    resetAndClose();
  }

  function resetAndClose() {
    setPreview(null);
    setImportedName(null);
    setError('');
    setShowAppendImport(false);
  }

  function cancel() {
    resetAndClose();
  }

  // Clear preview / parse-state without closing the popup — used by the
  // mode segmented control so stale state from one mode doesn't carry into
  // another.
  function clearParseState() {
    setPreview(null);
    setImportedName(null);
    setError('');
  }

  // Close the append overlay and jump to the full Import/Export menu panel
  function openFullImport() {
    setPreview(null);
    setImportedName(null);
    setError('');
    setShowAppendImport(false);
    // setActiveMenuPanel toggles, so only open if not already active
    if (useUiStore.getState().activeMenuPanel !== 'import-export') {
      setActiveMenuPanel('import-export');
    }
  }

  return {
    preview,
    importedName,
    loading,
    error,
    handleText,
    handleFile,
    confirmAppend,
    confirmReplace,
    confirmAsNew,
    cancel,
    clearParseState,
    openFullImport,
  };
}
