// Hook for the footer "Import Entries" overlay — parses a file and appends entries to the active lorebook
import { useState } from 'react';
import { useImport }        from './use-import.js';
import { useEntries }       from './use-entries.js';
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore }  from '../state/history-store.js';
import { useUiStore }       from '../state/ui-store.js';

export function useAppendImport() {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const { entries }             = useEntries();
  const { parseFile, parseTxt } = useImport();
  const activeLorebookId        = useLorebookStore((s) => s.activeLorebookId);
  const updateEntries           = useLorebookStore((s) => s.updateEntries);
  const pushSnapshot            = useHistoryStore((s) => s.pushSnapshot);
  const setShowAppendImport  = useUiStore((s) => s.setShowAppendImport);
  const setActiveMenuPanel   = useUiStore((s) => s.setActiveMenuPanel);

  function handleText(text) {
    setError('');
    setPreview(null);
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
    setLoading(true);
    try {
      const result = await parseFile(file);
      setPreview(result.entries);
    } catch (e) {
      setError(e.message ?? 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  }

  function confirmAppend() {
    if (!preview) return;
    pushSnapshot(activeLorebookId, { entries: [...entries] });
    updateEntries(activeLorebookId, [...entries, ...preview]);
    setPreview(null);
    setShowAppendImport(false);
  }

  function cancel() {
    setPreview(null);
    setError('');
    setShowAppendImport(false);
  }

  // Close the append overlay and jump to the full Import/Export menu panel
  function openFullImport() {
    setPreview(null);
    setError('');
    setShowAppendImport(false);
    // setActiveMenuPanel toggles, so only open if not already active
    if (useUiStore.getState().activeMenuPanel !== 'import-export') {
      setActiveMenuPanel('import-export');
    }
  }

  return { preview, loading, error, handleText, handleFile, confirmAppend, cancel, openFullImport };
}
