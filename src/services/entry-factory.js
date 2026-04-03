// Factory functions: createEmptyEntry() and createEmptyLorebook() with canonical default shapes
import { DEFAULT_ENTRY, DEFAULT_LOREBOOK } from '../constants/defaults.js';

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyEntry(overrides = {}) {
  return { ...DEFAULT_ENTRY, id: uid(), lastModified: Date.now(), ...overrides };
}

export function createEmptyLorebook(overrides = {}) {
  return { ...DEFAULT_LOREBOOK, id: uid(), ...overrides };
}
