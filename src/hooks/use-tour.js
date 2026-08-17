// Step runner for the guided feature tour.
//
// Owns four things the presentation component should not: which step is
// current, getting the app into the state each step needs, tracking where the
// spotlit control actually is, and lending the tour a lorebook to run on
// without disturbing the user's own.
//
// ── the demo set ────────────────────────────────────────────────────────────
// Loaded for real rather than held in memory. The memory-only version would
// have to suppress `autosave.js` mid-tour, and that is a debounced timer
// deliberately living outside React — surgery on it to guard against "the user
// closed the tab during a five-step tour" is the wrong trade. Loading for real
// means the worst case is a leftover book with "(tour sample)" in its name that
// the user can delete, not lost work.
//
// Cleanup is safe in any order: 14B made crosstalk *derived* from whether a
// reference book resolves, so a `referenceLorebookId` left pointing at a
// deleted sample is correctly not-crosstalk rather than a dangling pairing.
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useMobile }        from './use-mobile.js';
import { useLorebook }      from './use-lorebook.js';
import { createEmptyEntry } from '../services/entry-factory.js';
import { useUiStore }       from '../state/ui-store.js';
import { useLorebookStore } from '../state/lorebook-store.js';
import { tourStepsFor }     from '../constants/tour-steps.js';
import { TOUR_STEP_SETTLE_MS, TOUR_TARGET_TIMEOUT_MS } from '../constants/limits.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll for a selector, since arrival is async and React has to commit first. */
async function waitForTarget(selector, timeout = TOUR_TARGET_TIMEOUT_MS) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const el = document.querySelector(selector);
    if (el && el.getBoundingClientRect().width > 0) return el;
    if (Date.now() > deadline) return null;
    await wait(40);
  }
}

/**
 * What the lander needs to offer the tour: whether there is one for this
 * viewport, and how to start it. Separate from `useTour` so the lander does not
 * mount the runner — the runner loads lorebooks, and the lander is not where
 * that should happen.
 */
export function useTourLauncher() {
  const isMobile   = useMobile();
  const setOpen    = useUiStore((s) => s.setTourOpen);
  const setLander  = useUiStore((s) => s.setShowLander);
  const hasTour    = tourStepsFor({ isMobile }).length > 0;

  return {
    hasTour,
    // Into the builder first: every step spotlights something in there, and the
    // lander would otherwise sit on top of the whole tour.
    startTour: useCallback(() => { setLander(false); setOpen(true); }, [setLander, setOpen]),
  };
}

export function useTour() {
  const isMobile = useMobile();
  const open     = useUiStore((s) => s.tourOpen);
  const setOpen  = useUiStore((s) => s.setTourOpen);
  const { importAsNewLorebook, switchLorebook, deleteLorebook } = useLorebook();

  const steps = tourStepsFor({ isMobile });
  const [index, setIndex]   = useState(0);
  const [rect, setRect]     = useState(null);
  // The target went away under the tour — the user closed what `arrive` opened.
  // Surfaced rather than auto-restored: re-opening it behind them would make
  // taps stop feeling like they work, which is the whole premise.
  const [lost, setLost]     = useState(false);

  // Ids of the books this tour created, and where the user was before it did.
  const owned    = useRef([]);
  const restore  = useRef(null);
  // True while `arrive` is still running. The rect tracker below must not judge
  // a target missing during the moment the app is being walked to it.
  const arriving = useRef(false);
  // Whether this step's `advanceOn` condition was already satisfied when the
  // step opened. Only a false→true transition may advance, or stepping Back into
  // a step whose layer is still open would bounce forward again immediately.
  const armed    = useRef(false);
  const step     = steps[index] ?? null;

  // ── the api `arrive` receives ────────────────────────────────────────────
  // Everything a step is allowed to do to the app, in one object, so the step
  // list stays a declarative constant that imports no hooks.
  const api = useMemo(() => ({
    closeLayers: async () => {
      useUiStore.getState().closeAllLayers();
      await wait(TOUR_STEP_SETTLE_MS);
    },
    setSearchMode: async (mode) => {
      useUiStore.getState().setSearchMode(mode);
      await wait(TOUR_STEP_SETTLE_MS);
    },
    selectFirstEntry: async () => {
      const lb = useLorebookStore.getState();
      const first = lb.lorebooks[lb.activeLorebookId]?.entries?.[0];
      if (first) useUiStore.getState().toggleSelected(first.id);
      await wait(TOUR_STEP_SETTLE_MS);
    },
    openTitleMenu: async () => {
      useUiStore.getState().openMobileTitleMenu('lorebooks');
      await wait(TOUR_STEP_SETTLE_MS);
    },
    openReferenceChooser: async () => {
      useUiStore.getState().setReferenceChooserOpen(true);
      await wait(TOUR_STEP_SETTLE_MS);
    },
    openSettings: async () => {
      useUiStore.getState().openSettingsSection(null);
      await wait(TOUR_STEP_SETTLE_MS);
    },
    // Bring a target into view *and* leave the bubble somewhere to go. Placing
    // it centrally is what makes the flip heuristic reliable: a target in the
    // middle of the screen has room on both sides.
    scrollIntoView: async (selector) => {
      document.querySelector(selector)?.scrollIntoView({ block: 'center' });
      await wait(TOUR_STEP_SETTLE_MS);
    },
  }), []);

  // ── entering and leaving the tour ────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      const mod = await import('../constants/tour-lorebook.js');
      if (cancelled) return;
      restore.current = useLorebookStore.getState().activeLorebookId;

      // Reference book first, so it already exists in the list by the time the
      // chooser step offers it — and so the main book ends up active.
      //
      // `importAsNewLorebook` returns nothing; it makes the new book active, so
      // the id is read back from the store after each call. It also discards the
      // previously-active book when that was the bootstrap placeholder, which is
      // why `close()` re-checks that the restore target still exists — a
      // first-run user's pristine book is legitimately gone by then.
      const ids = [];
      for (const book of [mod.TOUR_REFERENCE_BOOK, mod.TOUR_MAIN_BOOK]) {
        // Through the entry factory rather than straight from the constant:
        // `importAsNewLorebook` writes the array it is given as-is, so entries
        // arrive without ids, and React keys and every id-addressed feature
        // (selection, the detail editor) fail quietly on them.
        const entries = book.entries.map((e) => createEmptyEntry(e));
        importAsNewLorebook({ entries, name: book.name });
        const id = useLorebookStore.getState().activeLorebookId;
        if (id) ids.push(id);
        if (cancelled) break;
      }
      owned.current = ids;
      // The bootstrap's first-run "name your lorebook" prompt is still pending
      // for anyone who has never used the app — which is most of the tour's
      // audience — and it renders over the builder the tour is trying to show.
      // The books it was asking about are named already.
      useUiStore.getState().setPendingFocusLorebookName(false);
      setIndex(0);
    })();

    return () => { cancelled = true; };
  // Runs on the open/close edge only — re-running on every render would
  // re-import the books underneath the tour.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = useCallback(() => {
    useUiStore.getState().closeAllLayers();
    useUiStore.getState().setSearchMode('search');
    useUiStore.getState().clearSelection();
    // Put the user back before deleting, so no delete ever has to decide what
    // becomes active in place of the book it removed. The book may be gone —
    // see the placeholder-discard note above — in which case leave the choice
    // to `deleteLorebook`, which falls back to the first book in the index.
    const stillThere = useLorebookStore.getState().lorebookIndex
      .some((b) => b.id === restore.current);
    if (restore.current && stillThere) switchLorebook(restore.current);
    for (const id of owned.current) deleteLorebook(id);
    owned.current = [];
    restore.current = null;
    setOpen(false);
    setIndex(0);
    setRect(null);
    setLost(false);
  }, [switchLorebook, deleteLorebook, setOpen]);

  // ── arrival ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !step) return;
    let cancelled = false;

    (async () => {
      setLost(false);
      arriving.current = true;
      await step.arrive?.(api);
      const el = cancelled ? null : await waitForTarget(step.target);
      // Arm only if the user has not already done the thing this step invites.
      armed.current = Boolean(step.advanceOn) && !document.querySelector(step.advanceOn);
      arriving.current = false;
      if (cancelled) return;
      // A target that never appears is skipped rather than spotlighted empty.
      // In development say so, because it means a selector has rotted.
      if (!el) {
        if (import.meta.env.DEV) {
          console.warn(`[tour] step "${step.id}": no element for ${step.target} — skipping`);
        }
        setIndex((i) => (i + 1 < steps.length ? i + 1 : i));
        return;
      }
      setRect(el.getBoundingClientRect());
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, step?.id]);

  // ── keeping up with the target ──────────────────────────────────────────
  // The spotlight is fixed-position over a live app, so anything that moves the
  // target has to move the hole: list scrolling, the keyboard opening, rotation.
  // Also how the vanished-target case is detected.
  useEffect(() => {
    if (!open || !step) return;
    let frame = 0;

    const track = () => {
      // Mid-arrival the target is legitimately absent — judging it lost here is
      // how the tour ends up offering "show me again" for a step it is still
      // walking to.
      if (arriving.current) return;

      // The user did the thing the step asked for — follow them rather than
      // leaving a ring around where the control used to be.
      if (armed.current && step.advanceOn && document.querySelector(step.advanceOn)) {
        armed.current = false;
        setIndex((i) => Math.min(steps.length - 1, i + 1));
        return;
      }

      const el = document.querySelector(step.target);
      if (!el) { setLost(true); return; }
      const next = el.getBoundingClientRect();
      setRect((prev) =>
        prev && prev.top === next.top && prev.left === next.left
          && prev.width === next.width && prev.height === next.height
          ? prev
          : next);
      setLost(false);
    };

    const onFrame = () => { track(); frame = requestAnimationFrame(onFrame); };
    frame = requestAnimationFrame(onFrame);
    return () => cancelAnimationFrame(frame);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step?.id, steps.length]);

  const go = useCallback((delta) => {
    setIndex((i) => Math.min(steps.length - 1, Math.max(0, i + delta)));
  }, [steps.length]);

  return {
    // `open` alone isn't enough to render: the books load asynchronously, and a
    // spotlight painted before them points at the user's own list.
    active: open && steps.length > 0,
    step,
    index,
    total: steps.length,
    rect,
    lost,
    first: index === 0,
    last:  index === steps.length - 1,
    go,
    close,
    // Re-run the current step's arrival — what the "Show me again" affordance
    // calls when the user has closed the thing being described.
    recover: useCallback(async () => {
      if (!step) return;
      await step.arrive?.(api);
      const el = await waitForTarget(step.target);
      if (el) { setRect(el.getBoundingClientRect()); setLost(false); }
    }, [step, api]),
  };
}
