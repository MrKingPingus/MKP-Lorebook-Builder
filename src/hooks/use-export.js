// Hook wrapping export services — components use this instead of importing services directly
import { exportToJsonBlob, downloadBlob } from '../services/json-export.js';
import { exportToTxtBlob }               from '../services/txt-export.js';
import { exportToDocxBlob }              from '../services/docx-export.js';
import { TEMPLATE_LOREBOOK }             from '../constants/defaults.js';

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
    const json = JSON.stringify(lorebook, null, 2);
    await navigator.clipboard.writeText(json);
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
    await navigator.clipboard.writeText(JSON.stringify(TEMPLATE_LOREBOOK, null, 2));
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
  };
}
