// Reactive crosstalk hook — subscribes to active (and, when crosstalk is on,
// reference) lorebook entries and returns the conflict map plus allow/revoke
// actions. Conflicts can span both books; allowing or revoking writes to
// every book the conflict involves so both sides stay in sync.
import { useMemo } from 'react';
import { useLorebookStore } from '../state/lorebook-store.js';
import { useSettingsStore } from '../state/settings-store.js';
import { scanCrosstalkAcrossBooks } from '../services/scan-service.js';

export function useCrosstalk() {
  const lorebooks                  = useLorebookStore((s) => s.lorebooks);
  const activeLorebookId           = useLorebookStore((s) => s.activeLorebookId);
  const referenceLorebookId        = useLorebookStore((s) => s.referenceLorebookId);
  const updateAllowedOverlapsForId = useLorebookStore((s) => s.updateAllowedOverlapsForId);
  const crosstalkEnabled           = useSettingsStore((s) => s.crosstalkEnabled);

  const activeLorebook    = activeLorebookId    ? lorebooks[activeLorebookId]    ?? null : null;
  const referenceLorebook = (crosstalkEnabled && referenceLorebookId)
    ? lorebooks[referenceLorebookId] ?? null
    : null;

  const activeEntries    = activeLorebook?.entries    ?? [];
  const referenceEntries = referenceLorebook?.entries ?? [];

  // Re-scan only when entries or book ids change. The single-book path still
  // uses scanCrosstalkAcrossBooks so consumers get one consistent shape
  // (`{id, name, type, bookId, isOtherBook}` per finding) regardless of mode.
  const conflictMap = useMemo(() => {
    const books = referenceLorebook
      ? [
          { entries: activeEntries,    bookId: activeLorebookId },
          { entries: referenceEntries, bookId: referenceLorebookId },
        ]
      : [{ entries: activeEntries, bookId: activeLorebookId }];
    const raw = scanCrosstalkAcrossBooks(books);
    // Tag findings with isOtherBook so chip popovers can group/section without
    // having to know the active book id themselves.
    const tagged = new Map();
    for (const [trigger, list] of raw) {
      tagged.set(trigger, list.map((e) => ({ ...e, isOtherBook: e.bookId !== activeLorebookId })));
    }
    return tagged;
  }, [activeEntries, referenceEntries, activeLorebookId, referenceLorebookId, referenceLorebook]);

  // Union of both books' allowedOverlaps. Allow/revoke always write to every
  // book a given conflict involves, so the union and per-book intersection
  // agree in the steady state — a chip showing "acknowledged" means every
  // involved book has agreed.
  const allowedOverlaps = useMemo(() => {
    const a = activeLorebook?.allowedOverlaps    ?? [];
    const r = referenceLorebook?.allowedOverlaps ?? [];
    return Array.from(new Set([...a, ...r]));
  }, [activeLorebook, referenceLorebook]);

  function involvedBookIds(triggerLower) {
    const conflicts = conflictMap.get(triggerLower);
    if (!conflicts) return [];
    return Array.from(new Set(conflicts.map((c) => c.bookId)));
  }

  function allowOverlap(triggerLower) {
    for (const bookId of involvedBookIds(triggerLower)) {
      const list = lorebooks[bookId]?.allowedOverlaps ?? [];
      if (!list.includes(triggerLower)) {
        updateAllowedOverlapsForId(bookId, [...list, triggerLower]);
      }
    }
  }

  // Bulk variant — groups writes per-book so a multi-trigger acknowledgement
  // produces one update per book instead of fighting stale state in a loop.
  function allowOverlaps(triggerLowers) {
    const perBook = new Map(); // bookId → Set<trigger>
    for (const t of triggerLowers) {
      for (const bookId of involvedBookIds(t)) {
        if (!perBook.has(bookId)) perBook.set(bookId, new Set());
        perBook.get(bookId).add(t);
      }
    }
    for (const [bookId, addSet] of perBook) {
      const existing = lorebooks[bookId]?.allowedOverlaps ?? [];
      const toAdd = [...addSet].filter((t) => !existing.includes(t));
      if (toAdd.length === 0) continue;
      updateAllowedOverlapsForId(bookId, [...existing, ...toAdd]);
    }
  }

  function revokeOverlap(triggerLower) {
    for (const bookId of involvedBookIds(triggerLower)) {
      const list = lorebooks[bookId]?.allowedOverlaps ?? [];
      if (list.includes(triggerLower)) {
        updateAllowedOverlapsForId(bookId, list.filter((t) => t !== triggerLower));
      }
    }
  }

  return { conflictMap, allowedOverlaps, allowOverlap, allowOverlaps, revokeOverlap };
}
