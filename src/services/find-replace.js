// Pure function: bulk find-and-replace across entry name, trigger, and description fields; returns updated entries
import { escapeRegex } from './html-escape.js';

// Default scope: all fields included, whole words only.
const DEFAULT_SCOPE = { title: true, triggers: true, description: true, wholeWord: true };

/**
 * The search pattern: case-insensitive, and with `wholeWord` only where the
 * match is not part of a longer word. Whole words is the default because a
 * lorebook replace is almost always a name: "foxian" → "bobs burgers" used to
 * turn "Foxians" into "bobs burgerss", and with whole words it finds nothing
 * there, which shows the typo before anything changes. A boundary only applies
 * on a side where the search itself starts or ends with a letter or digit, so
 * "Dr." still matches before a space.
 */
function buildPattern(find, scope) {
  const body = escapeRegex(find);
  if (!scope?.wholeWord) return new RegExp(body, 'giu');
  const wordy = /[\p{L}\p{N}_]/u;
  const before = wordy.test(find[0]) ? '(?<![\\p{L}\\p{N}_])' : '';
  const after  = wordy.test(find[find.length - 1]) ? '(?![\\p{L}\\p{N}_])' : '';
  return new RegExp(`${before}${body}${after}`, 'giu');
}

/**
 * Perform a case-insensitive find-and-replace across selected entry fields.
 * scope: { title, triggers, description } — each boolean controls which fields are affected.
 */
export function findReplace(entries, find, replace, scope = DEFAULT_SCOPE) {
  if (!find) return entries;
  const pattern = buildPattern(find, scope);
  // A function, so a "$&" or "$1" typed as replacement text is inserted as
  // typed rather than read as a pattern reference.
  const literal = () => replace;

  return entries.map((entry) => ({
    ...entry,
    name:        scope.title       ? entry.name.replace(pattern, literal)                   : entry.name,
    triggers:    scope.triggers    ? entry.triggers.map((t) => t.replace(pattern, literal)) : entry.triggers,
    description: scope.description ? entry.description.replace(pattern, literal)            : entry.description,
  }));
}

/**
 * Count total occurrences of `find` across selected entry fields.
 */
export function countMatches(entries, find, scope = DEFAULT_SCOPE) {
  if (!find) return 0;
  const pattern = buildPattern(find, scope);
  let count = 0;
  for (const entry of entries) {
    if (scope.title)       count += (entry.name.match(pattern) || []).length;
    if (scope.triggers)    for (const t of entry.triggers) count += (t.match(pattern) || []).length;
    if (scope.description) count += (entry.description.match(pattern) || []).length;
  }
  return count;
}

/**
 * For each entry that has at least one match in the scoped fields, return
 * `{ id, name, locations }` where locations is `('name'|'trigger'|'description')[]`.
 * Drives the find/replace popover preview list.
 */
export function matchDetails(entries, find, scope = DEFAULT_SCOPE) {
  if (!find) return [];
  const pattern = buildPattern(find, scope);
  const has = (str) => str.match(pattern) !== null;
  const out = [];
  for (const entry of entries) {
    const locations = [];
    if (scope.title       && has(entry.name))                    locations.push('name');
    if (scope.triggers    && entry.triggers.some((t) => has(t))) locations.push('trigger');
    if (scope.description && has(entry.description))             locations.push('description');
    if (locations.length > 0) out.push({ id: entry.id, name: entry.name, locations });
  }
  return out;
}

/**
 * Bulk change entry type for a given set of ids; entries not in the set are returned unchanged.
 * No-op when the target type already matches — preserves reference equality per-entry.
 */
export function changeTypeForIds(entries, ids, toType) {
  if (!toType || !ids) return entries;
  const idSet = ids instanceof Set ? ids : new Set(ids);
  if (idSet.size === 0) return entries;
  return entries.map((entry) =>
    idSet.has(entry.id) && entry.type !== toType
      ? { ...entry, type: toType, lastModified: Date.now() }
      : entry
  );
}
