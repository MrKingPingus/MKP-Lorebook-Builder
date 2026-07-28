// Save-state readout for the status footer.
//
// The autosave service already stamps `ui-store.savedAt` after every successful
// write (services/autosave.js) — that field has existed unread since it was
// added "for SaveBadge". This turns it into a label that ages on its own, so
// the footer says "Saved 4m ago" without a save having to happen to update it.
import { useEffect, useState } from 'react';
import { useUiStore } from '../state/ui-store.js';
import { SAVE_STATUS_FRESH_MS, SAVE_STATUS_TICK_MS } from '../constants/limits.js';

function ageLabel(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 1)  return 'Saved';
  if (mins < 60) return `Saved ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `Saved ${hours}h ago`;
}

export function useSaveStatus() {
  const savedAt = useUiStore((s) => s.savedAt);

  // Slow tick so the relative label ages between writes. Only runs once
  // something has actually been saved — an untouched session pays nothing.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!savedAt) return undefined;
    const timer = setInterval(() => setTick((n) => n + 1), SAVE_STATUS_TICK_MS);
    return () => clearInterval(timer);
  }, [savedAt]);

  if (!savedAt) {
    return {
      savedAt: null,
      fresh:   false,
      label:   'No changes yet',
      title:   'Nothing has needed saving this session. Edits save automatically.',
    };
  }

  const age = Date.now() - savedAt;
  return {
    savedAt,
    fresh: age < SAVE_STATUS_FRESH_MS,
    label: ageLabel(age),
    title: `Last saved to this browser at ${new Date(savedAt).toLocaleTimeString()}`,
  };
}
