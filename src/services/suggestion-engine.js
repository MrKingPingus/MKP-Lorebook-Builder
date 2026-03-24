// Generate type-aware trigger keyword suggestions from entry name, type, and description data
import { ENTRY_TYPES } from '../constants/entry-types.js';

const TYPE_PREFIXES = {
  character:  ['the', 'young', 'old', 'mysterious', 'brave'],
  location:   ['the', 'ancient', 'hidden', 'ruined', 'grand'],
  item:       ['legendary', 'enchanted', 'cursed', 'ancient', 'sacred'],
  plot_event: ['the', 'great', 'final', 'secret', 'lost'],
  other:      [],
};

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function unique(arr) {
  return [...new Set(arr)];
}

/**
 * Generate up to `limit` trigger keyword suggestions for an entry.
 * Draws from the entry name, type-specific prefixes, and description tokens.
 */
export function generateSuggestions(entry, existingTriggers = [], limit = 12) {
  const existing = new Set(existingTriggers.map((t) => t.toLowerCase()));

  const nameParts = tokenize(entry.name || '');
  const descTokens = tokenize(entry.description || '').slice(0, 30);
  const prefixes = TYPE_PREFIXES[entry.type] ?? [];

  const candidates = [];

  // Full name as first suggestion
  if (entry.name && entry.name.trim()) {
    candidates.push(entry.name.trim().toLowerCase());
  }

  // Name parts
  candidates.push(...nameParts);

  // Prefix + name combinations
  for (const prefix of prefixes) {
    if (entry.name) {
      candidates.push(`${prefix} ${entry.name.trim().toLowerCase()}`);
    }
    for (const part of nameParts) {
      candidates.push(`${prefix} ${part}`);
    }
  }

  // Description tokens
  candidates.push(...descTokens);

  return unique(candidates)
    .filter((s) => s.length > 1 && !existing.has(s))
    .slice(0, limit);
}
