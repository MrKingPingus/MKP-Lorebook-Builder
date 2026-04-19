// Reactive crosstalk hook — subscribes to active lorebook entries and returns the conflict map
// plus allow/revoke actions for the lorebook-level allowedOverlaps list.
import { useMemo } from 'react';
import { useLorebookStore }  from '../state/lorebook-store.js';
import { useSideLorebookId } from './use-side.js';
import { scanCrosstalk }     from '../services/scan-service.js';

export function useCrosstalk() {
  const targetId              = useSideLorebookId();
  const lorebooks             = useLorebookStore((s) => s.lorebooks);
  const updateAllowedOverlaps = useLorebookStore((s) => s.updateAllowedOverlaps);

  const targetLorebook  = targetId ? lorebooks[targetId] ?? null : null;
  const entries         = targetLorebook?.entries         ?? [];
  const allowedOverlaps = targetLorebook?.allowedOverlaps ?? [];

  const conflictMap = useMemo(() => scanCrosstalk(entries), [entries]);

  function allowOverlap(triggerLower) {
    if (!allowedOverlaps.includes(triggerLower)) {
      updateAllowedOverlaps(targetId, [...allowedOverlaps, triggerLower]);
    }
  }

  function allowOverlaps(triggerLowers) {
    const toAdd = triggerLowers.filter((t) => !allowedOverlaps.includes(t));
    if (toAdd.length === 0) return;
    updateAllowedOverlaps(targetId, [...allowedOverlaps, ...toAdd]);
  }

  function revokeOverlap(triggerLower) {
    updateAllowedOverlaps(targetId, allowedOverlaps.filter((t) => t !== triggerLower));
  }

  return { conflictMap, allowedOverlaps, allowOverlap, allowOverlaps, revokeOverlap };
}
