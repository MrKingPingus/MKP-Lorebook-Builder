// Serialize the active lorebook state to a prettified JSON Blob ready for download

export function exportToJsonBlob(lorebook) {
  const exported = {
    ...lorebook,
    // Strip app-internal metadata that is meaningless outside the app.
    // hiddenFromExport entries are omitted entirely; the flag itself is also stripped.
    rollback: undefined,
    entries: lorebook.entries
      .filter((e) => !e.hiddenFromExport)
      .map(({ snapshots: _s, hiddenFromExport: _h, ...rest }) => rest),
  };
  const json = JSON.stringify(exported, null, 2);
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
