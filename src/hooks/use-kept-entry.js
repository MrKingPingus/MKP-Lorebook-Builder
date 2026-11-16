// "Keep in view" (#137): one entry from the active book held read-only beside
// the editor — desktop's second pane, mobile's peek behind a bar in the entry
// editor — with an optional Highlight Differences against another entry.
//
// The highlight marks only the kept entry's OWN words: the ones the compared
// entry lacks. It never shows the other entry's words struck through, because
// the other entry is already on screen (desktop) or one tap away (mobile), and
// interleaving both sides reads as word salad even for two versions of one
// character. The side-by-side compare mode draws each side the same way.
//
// useKeptEntry() computes the diff, so only the panel and the peek call it.
// Per-card readers use the light hooks at the bottom of the file.
import { useMemo } from 'react';
import { useUiStore }       from '../state/ui-store.js';
import { useLorebookStore } from '../state/lorebook-store.js';
import { diffEntries }      from '../services/diff-service.js';
import { useMobile }        from './use-mobile.js';

// Fields the "N fields differ" count ignores: two different entries always
// have different names, so counting it would only ever add one.
const UNCOUNTED_FIELDS = new Set(['name']);

function useActiveEntries() {
  const lorebooks        = useLorebookStore((s) => s.lorebooks);
  const activeLorebookId = useLorebookStore((s) => s.activeLorebookId);
  return { activeLorebookId, lorebooks, entries: lorebooks[activeLorebookId]?.entries ?? [] };
}

function findKept(kept, activeLorebookId, entries) {
  if (!kept || kept.lorebookId !== activeLorebookId) return null;
  return entries.find((e) => e.id === kept.entryId) ?? null;
}

export function useKeptEntry() {
  const isMobile            = useMobile();
  const kept                = useUiStore((s) => s.keptEntry);
  const diffOn              = useUiStore((s) => s.keptDiffOn);
  const pickedCompareId     = useUiStore((s) => s.keptCompareWithId);
  const lastFocusedEntryId  = useUiStore((s) => s.lastFocusedEntryId);
  const openEditorEntryId   = useUiStore((s) => s.activeEntryId);
  const peekOpen            = useUiStore((s) => s.keptPeekOpen);
  const clearKeptEntry      = useUiStore((s) => s.clearKeptEntry);
  const swapKeptEntry       = useUiStore((s) => s.swapKeptEntry);
  const setKeptDiffOn       = useUiStore((s) => s.setKeptDiffOn);
  const setKeptCompareWithId = useUiStore((s) => s.setKeptCompareWithId);
  const setKeptPeekOpen     = useUiStore((s) => s.setKeptPeekOpen);
  const setPeekReferenceEntryId = useUiStore((s) => s.setPeekReferenceEntryId);
  const setActiveEntryId    = useUiStore((s) => s.setActiveEntryId);
  const setPendingFocusEntryId = useUiStore((s) => s.setPendingFocusEntryId);
  const referenceLorebookId = useLorebookStore((s) => s.referenceLorebookId);
  const { activeLorebookId, lorebooks, entries } = useActiveEntries();

  const keptEntry = findKept(kept, activeLorebookId, entries);
  const keptIndex = keptEntry ? entries.indexOf(keptEntry) + 1 : 0;

  // What the kept entry is compared against: the one picked in "Compared
  // with", else the entry being worked in. Never the kept entry itself, and a
  // picked entry that has since been deleted falls back to following.
  const followId = isMobile ? openEditorEntryId : lastFocusedEntryId;
  const byId = (id) => (id && id !== keptEntry?.id ? entries.find((e) => e.id === id) ?? null : null);
  const compareWith = byId(pickedCompareId) ?? byId(followId);

  const delta = useMemo(
    () => (diffOn && keptEntry && compareWith ? diffEntries(compareWith, keptEntry) : null),
    [diffOn, keptEntry, compareWith],
  );

  const descriptionParts = useMemo(() => {
    if (!keptEntry) return [];
    if (!delta?.description) return [{ text: keptEntry.description, unique: false }];
    return delta.description.segments
      .filter((seg) => seg.kind !== 'del')
      .map((seg) => ({ text: seg.text, unique: seg.kind === 'add' }));
  }, [keptEntry, delta]);

  const triggerParts = useMemo(() => {
    if (!keptEntry) return [];
    const unique = new Set(delta?.triggers.added ?? []);
    return keptEntry.triggers.map((text) => ({ text, unique: unique.has(text) }));
  }, [keptEntry, delta]);

  const differingCount = delta
    ? [...delta.changedFields].filter((f) => !UNCOUNTED_FIELDS.has(f)).length
    : 0;
  const conditionDiffers = !!delta && (delta.changedFields.has('triggerCondition') || delta.changedFields.has('alwaysOn'));

  const compareCandidates = useMemo(
    () => entries.filter((e) => e.id !== keptEntry?.id).map((e) => ({ id: e.id, name: e.name })),
    [entries, keptEntry],
  );

  // The paired reference book gives up the desktop pane while an entry is kept.
  const pausedReferenceName = referenceLorebookId ? (lorebooks[referenceLorebookId]?.name ?? '') : null;

  // The entry being edited becomes the kept one, and the old kept entry opens
  // for editing — expanded and focused on desktop, in the editor on mobile.
  function swap() {
    if (!keptEntry || !compareWith) return;
    const previous = keptEntry.id;
    swapKeptEntry(activeLorebookId, compareWith.id, previous);
    if (isMobile) {
      setKeptPeekOpen(false);
      setActiveEntryId(previous);
    } else {
      setPendingFocusEntryId(previous);
    }
  }

  function openPeek() {
    setPeekReferenceEntryId(null);  // one full-screen peek at a time
    setKeptPeekOpen(true);
  }

  return {
    keptEntry,
    keptIndex,
    compareWith,
    compareCandidates,
    diffOn,
    differingCount,
    conditionDiffers,
    descriptionParts,
    triggerParts,
    pausedReferenceName,
    peekOpen: peekOpen && !!keptEntry,
    // Mobile: the editor is showing the kept entry itself, so there is nothing to flip to.
    isOpenInEditor: !!keptEntry && openEditorEntryId === keptEntry.id,
    setDiffOn:        setKeptDiffOn,
    setCompareWithId: setKeptCompareWithId,
    close:            clearKeptEntry,
    swap,
    openPeek,
    closePeek: () => setKeptPeekOpen(false),
  };
}

// Whether an entry from the active book is in view — what decides whether the
// desktop window shows its second pane for it.
export function useHasKeptEntry() {
  const kept = useUiStore((s) => s.keptEntry);
  const { activeLorebookId, entries } = useActiveEntries();
  return !!findKept(kept, activeLorebookId, entries);
}

// Per-entry: is this the kept one, and the action to keep or stop keeping it.
// The ⋯ menus and the entry cards call this, so it reads no entries.
export function useKeepInView(entryId) {
  const kept             = useUiStore((s) => s.keptEntry);
  const activeLorebookId = useLorebookStore((s) => s.activeLorebookId);
  const keepEntryInView  = useUiStore((s) => s.keepEntryInView);
  const clearKeptEntry   = useUiStore((s) => s.clearKeptEntry);
  const isKept = !!kept && kept.lorebookId === activeLorebookId && kept.entryId === entryId;
  return {
    isKept,
    toggleKeep: () => (isKept ? clearKeptEntry() : keepEntryInView(activeLorebookId, entryId)),
  };
}

// Close the kept view. Used where another feature needs the second pane back —
// the crosstalk badges on an entry card point into the reference pane.
export function useCloseKeptEntry() {
  const kept           = useUiStore((s) => s.keptEntry);
  const clearKeptEntry = useUiStore((s) => s.clearKeptEntry);
  return () => { if (kept) clearKeptEntry(); };
}
