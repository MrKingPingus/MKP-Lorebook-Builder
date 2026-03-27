// Serialize lorebook entries to the Entry:/Type:/Triggers:/Description: format as a Blob

/**
 * Convert a lorebook to the plain-text labeled format:
 *
 *   Entry: Entry Name
 *   Type: type
 *   Triggers: trigger1, trigger2
 *   Description:
 *   description text...
 *
 *   Entry: Next Entry
 *   ...
 */
export function exportToTxtBlob(lorebook) {
  const blocks = lorebook.entries.map((entry) => {
    const triggers = entry.triggers.length
      ? `Triggers: ${entry.triggers.join(', ')}`
      : 'Triggers:';
    const body = entry.description || '';
    return [`Entry: ${entry.name || '(unnamed)'}`, `Type: ${entry.type}`, triggers, 'Description:', body].join('\n');
  });

  const text = blocks.join('\n\n');
  return new Blob([text], { type: 'text/plain' });
}
