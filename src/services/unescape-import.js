// Remove stray escape-backslash artifacts introduced by upstream tooling (LLM string
// dumps, markdown-escaping AIs, etc.). Typical culprits: `World\'s` from escaped
// apostrophes, `\*bold\*` from escaped markdown, `\"quoted\"` from escaped quotes.
//
// Rule: a single backslash followed by a character we recognise as "commonly
// escaped" is replaced with just that character. A literal `\\` collapses to `\`.
// All other backslashes are preserved — filesystem paths like `C:\Users\name`
// survive untouched because `\U` / `\n` are not in the set.
//
// Covered escape targets: quote chars (' "), markdown structural chars
// (* _ ~ # > | ` [ ] ( )), and the literal backslash itself (\).
const IMPORT_ESCAPE = /\\(['"*_~#>|`\[\]()\\])/g;

/** Strip spurious import-escape backslashes from a single string field. */
export function unescapeImportedString(str) {
  if (typeof str !== 'string' || !str) return str;
  return str.replace(IMPORT_ESCAPE, '$1');
}

/** Apply unescape to an entry's text-bearing fields, returning a new object. */
export function unescapeImportedEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  return {
    ...entry,
    name:        unescapeImportedString(entry.name),
    description: unescapeImportedString(entry.description),
    triggers:    Array.isArray(entry.triggers)
      ? entry.triggers.map(unescapeImportedString)
      : entry.triggers,
  };
}
