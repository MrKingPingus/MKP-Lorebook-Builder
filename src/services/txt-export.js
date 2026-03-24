// Serialize lorebook entries to the === header === block plain-text format as a Blob

/**
 * Convert a lorebook to the plain-text template format:
 *
 *   === Entry Name [Type] ===
 *   Triggers: trigger1, trigger2
 *
 *   description text...
 *
 *   === Next Entry ===
 */
export function exportToTxtBlob(lorebook) {
  const blocks = lorebook.entries.map((entry) => {
    const header = `=== ${entry.name || '(unnamed)'} [${entry.type}] ===`;
    const triggers = entry.triggers.length
      ? `Triggers: ${entry.triggers.join(', ')}`
      : 'Triggers:';
    const body = entry.description || '';
    return [header, triggers, '', body].join('\n');
  });

  const text = blocks.join('\n\n---\n\n');
  return new Blob([text], { type: 'text/plain' });
}
