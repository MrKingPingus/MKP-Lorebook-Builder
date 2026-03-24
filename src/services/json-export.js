// Serialize the active lorebook state to a prettified JSON Blob ready for download

export function exportToJsonBlob(lorebook) {
  const json = JSON.stringify(lorebook, null, 2);
  return new Blob([json], { type: 'application/json' });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
