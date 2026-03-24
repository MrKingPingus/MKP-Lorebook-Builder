// Pure function: bulk find-and-replace across all entry trigger and description fields; returns updated entries
import { escapeRegex } from './html-escape.js';

/**
 * Perform a case-insensitive find-and-replace across all entry trigger arrays
 * and description strings. Returns a new entries array.
 */
export function findReplace(entries, find, replace) {
  if (!find) return entries;
  const pattern = new RegExp(escapeRegex(find), 'gi');

  return entries.map((entry) => ({
    ...entry,
    triggers:    entry.triggers.map((t) => t.replace(pattern, replace)),
    description: entry.description.replace(pattern, replace),
  }));
}

/**
 * Count total occurrences of `find` across all trigger and description fields.
 */
export function countMatches(entries, find) {
  if (!find) return 0;
  const pattern = new RegExp(escapeRegex(find), 'gi');
  let count = 0;
  for (const entry of entries) {
    for (const t of entry.triggers) {
      count += (t.match(pattern) || []).length;
    }
    count += (entry.description.match(pattern) || []).length;
  }
  return count;
}
