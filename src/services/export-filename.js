// Download filenames derived from a lorebook name.
//
// Lorebook names are free text — spaces, punctuation, emoji — none of which
// belong in a filename that has to survive Windows, macOS, and a browser's
// download folder. Everything outside [A-Za-z0-9_-] collapses to an underscore.

const UNSAFE = /[^a-z0-9_-]/gi;
const EDGE_UNDERSCORES = /^_+|_+$/g;

// The filename a lorebook exports under when the user hasn't overridden it.
export function defaultExportFilename(lorebookName) {
  return (lorebookName || 'lorebook').replace(UNSAFE, '_');
}

// Sanitize a user-typed override, falling back to the lorebook's own safe name
// when the override cleans down to nothing (e.g. the user typed only spaces).
export function resolveExportFilename(override, lorebookName) {
  const cleaned = (override || '').replace(UNSAFE, '_').replace(EDGE_UNDERSCORES, '');
  return cleaned || defaultExportFilename(lorebookName);
}
