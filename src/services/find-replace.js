// Pure function: bulk find-and-replace across entry name, trigger, and description fields; returns updated entries
import { escapeRegex } from './html-escape.js';

// Default scope: all fields included
const DEFAULT_SCOPE = { title: true, triggers: true, description: true };

/**
 * Perform a case-insensitive find-and-replace across selected entry fields.
 * scope: { title, triggers, description } — each boolean controls which fields are affected.
 */
export function findReplace(entries, find, replace, scope = DEFAULT_SCOPE) {
  if (!find) return entries;
  const pattern = new RegExp(escapeRegex(find), 'gi');

  return entries.map((entry) => ({
    ...entry,
    name:        scope.title       ? entry.name.replace(pattern, replace)                   : entry.name,
    triggers:    scope.triggers    ? entry.triggers.map((t) => t.replace(pattern, replace)) : entry.triggers,
    description: scope.description ? entry.description.replace(pattern, replace)            : entry.description,
  }));
}

/**
 * Count total occurrences of `find` across selected entry fields.
 */
export function countMatches(entries, find, scope = DEFAULT_SCOPE) {
  if (!find) return 0;
  const pattern = new RegExp(escapeRegex(find), 'gi');
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
  const pattern = new RegExp(escapeRegex(find), 'gi');
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
