// Generic lorebook scanner — accepts a predicate over (entry, lorebook) and returns findings.
// Also exports domain-specific scanners built on top of the primitive.

/**
 * Generic scan: apply predicate to every entry and collect findings.
 * predicate(entry, allEntries) → any truthy value becomes the finding for that entry.
 * Returns an array of { entry, finding } objects.
 */
export function scan(entries, predicate) {
  const findings = [];
  for (const entry of entries) {
    const finding = predicate(entry, entries);
    if (finding) findings.push({ entry, finding });
  }
  return findings;
}

/**
 * Crosstalk scan: find triggers shared across two or more entries.
 * Returns a Map<triggerLower, entry[]> — only triggers that appear in 2+ entries.
 * Consumers filter out entries in allowedOverlaps themselves if needed.
 */
export function scanCrosstalk(entries) {
  const triggerIndex = new Map(); // triggerLower → entry[]

  for (const entry of entries) {
    for (const trigger of entry.triggers) {
      const key = trigger.toLowerCase();
      if (!triggerIndex.has(key)) triggerIndex.set(key, []);
      triggerIndex.get(key).push(entry);
    }
  }

  // Keep only triggers shared by 2+ entries
  for (const [key, entryList] of triggerIndex) {
    if (entryList.length < 2) triggerIndex.delete(key);
  }

  return triggerIndex;
}
