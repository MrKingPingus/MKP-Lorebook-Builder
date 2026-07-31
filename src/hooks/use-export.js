// Hook wrapping export services — components use this instead of importing services directly
import { exportToJsonBlob, downloadBlob } from '../services/json-export.js';
import { exportToTxtBlob }               from '../services/txt-export.js';
import { exportToDocxBlob }              from '../services/docx-export.js';
import { TEMPLATE_LOREBOOK }             from '../constants/defaults.js';
import { defaultExportFilename, resolveExportFilename } from '../services/export-filename.js';

export function useExport() {
  function exportJson(lorebook, filename) {
    const blob = exportToJsonBlob(lorebook);
    downloadBlob(blob, filename);
  }

  function exportTxt(lorebook, filename) {
    const blob = exportToTxtBlob(lorebook);
    downloadBlob(blob, filename);
  }

  function exportDocx(lorebook, filename) {
    const blob = exportToDocxBlob(lorebook);
    downloadBlob(blob, filename);
  }

  function exportJsonBlob(lorebook) {
    return exportToJsonBlob(lorebook);
  }

  async function copyJsonToClipboard(lorebook) {
    // Route through exportToJsonBlob so the hiddenFromExport filter + app-internal metadata
    // stripping apply identically to download and clipboard paths.
    const text = await exportToJsonBlob(lorebook).text();
    await navigator.clipboard.writeText(text);
  }

  function downloadJsonTemplate() {
    const blob = exportToJsonBlob(TEMPLATE_LOREBOOK);
    downloadBlob(blob, 'lorebook-template.json');
  }

  function downloadTxtTemplate() {
    const blob = exportToTxtBlob(TEMPLATE_LOREBOOK);
    downloadBlob(blob, 'lorebook-template.txt');
  }

  function downloadDocxTemplate() {
    const blob = exportToDocxBlob(TEMPLATE_LOREBOOK);
    downloadBlob(blob, 'lorebook-template.docx');
  }

  async function copyJsonTemplate() {
    // Route through exportToJsonBlob so the copied template matches the downloaded
    // template's CharSnap shape (entryType labels, isPublic, keyed-object entries).
    const text = await exportToJsonBlob(TEMPLATE_LOREBOOK).text();
    await navigator.clipboard.writeText(text);
  }

  async function copyTxtTemplate() {
    const text = await exportToTxtBlob(TEMPLATE_LOREBOOK).text();
    await navigator.clipboard.writeText(text);
  }

  return {
    exportJson,
    exportTxt,
    exportDocx,
    exportJsonBlob,
    copyJsonToClipboard,
    downloadJsonTemplate,
    downloadTxtTemplate,
    downloadDocxTemplate,
    copyJsonTemplate,
    copyTxtTemplate,
    defaultExportFilename,
    resolveExportFilename,
  };
}
