// Hook wrapping import services — components use this instead of importing services directly
import { parseTxtToEntries, readTxtFile } from '../services/txt-import.js';
import { importFromDocx }                 from '../services/docx-import.js';
import { readJsonFile, importFromJson }   from '../services/json-import.js';

const EXT_TO_FORMAT = { txt: 'txt', docx: 'docx', odt: 'docx', json: 'json' };

export function useImport() {
  function detectFormat(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return EXT_TO_FORMAT[ext] ?? null;
  }

  async function parseFile(file) {
    const fmt = detectFormat(file.name);
    if (!fmt) throw new Error('Unsupported file type.');

    if (fmt === 'txt') {
      const text = await readTxtFile(file);
      return { entries: parseTxtToEntries(text), name: null };
    }

    if (fmt === 'docx') {
      const entries = await importFromDocx(file);
      return { entries, name: null };
    }

    // json
    const raw = await readJsonFile(file);
    const result = importFromJson(raw);
    if (!result.ok) throw new Error(result.error);
    if (result.lorebook.entries.length === 0) {
      throw new Error('No entries found. The file may use an unsupported format.');
    }
    return { entries: result.lorebook.entries, name: result.lorebook.name ?? null };
  }

  function parseTxt(text) {
    return parseTxtToEntries(text.trim());
  }

  return { detectFormat, parseFile, parseTxt };
}
