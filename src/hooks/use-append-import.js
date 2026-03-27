// Hook for the footer "Import Entries" overlay — parses a file and appends entries to the active lorebook
import { useState } from 'react';
import { parseTxtToEntries, readTxtFile } from '../services/txt-import.js';
import { importFromDocx }                 from '../services/docx-import.js';
import { readJsonFile, importFromJson }   from '../services/json-import.js';
import { useEntries }       from './use-entries.js';
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore }  from '../state/history-store.js';
import { useUiStore }       from '../state/ui-store.js';

const EXT_TO_FORMAT = { txt: 'txt', docx: 'docx', odt: 'docx', json: 'json' };

export function useAppendImport() {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const { entries }          = useEntries();
  const updateActiveEntries  = useLorebookStore((s) => s.updateActiveEntries);
  const pushSnapshot         = useHistoryStore((s) => s.pushSnapshot);
  const setShowAppendImport  = useUiStore((s) => s.setShowAppendImport);

  async function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const fmt = EXT_TO_FORMAT[ext];
    if (!fmt) { setError('Unsupported file type.'); return; }

    setError('');
    setPreview(null);
    setLoading(true);
    try {
      let parsed;
      if (fmt === 'txt') {
        const text = await readTxtFile(file);
        parsed = parseTxtToEntries(text);
      } else if (fmt === 'docx') {
        parsed = await importFromDocx(file);
      } else {
        const raw = await readJsonFile(file);
        const result = importFromJson(raw);
        if (!result.ok) { setError(result.error); return; }
        parsed = result.lorebook.entries;
      }
      setPreview(parsed);
    } catch (e) {
      setError(e.message ?? 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  }

  function confirmAppend() {
    if (!preview) return;
    pushSnapshot({ entries: [...entries] });
    updateActiveEntries([...entries, ...preview]);
    setPreview(null);
    setShowAppendImport(false);
  }

  function cancel() {
    setPreview(null);
    setError('');
    setShowAppendImport(false);
  }

  return { preview, loading, error, handleFile, confirmAppend, cancel };
}
