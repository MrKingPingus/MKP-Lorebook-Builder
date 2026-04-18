// Reactive crosstalk hook — subscribes to active lorebook entries and returns the conflict map
// plus allow/revoke actions for the lorebook-level allowedOverlaps list.
import { useMemo } from 'react';
import { useLorebookStore }  from '../state/lorebook-store.js';
import { scanCrosstalk }     from '../services/scan-service.js';

export function useCrosstalk() {
  const lorebooks        = useLorebookStore((s) => s.lorebooks);
  const activeLorebookId = useLorebookStore((s) => s.activeLorebookId);
  const updateAllowedOverlaps = useLorebookStore((s) => s.updateAllowedOverlaps);

  const activeLorebook   = activeLorebookId ? lorebooks[activeLorebookId] ?? null : null;
  const entries          = activeLorebook?.entries          ?? [];
  const allowedOverlaps  = activeLorebook?.allowedOverlaps  ?? [];

  // Re-run scan only when the entries array reference changes (i.e. a trigger was committed)
  const conflictMap = useMemo(() => scanCrosstalk(entries), [entries]);

  function allowOverlap(triggerLower) {
    if (!allowedOverlaps.includes(triggerLower)) {
      updateAllowedOverlaps([...allowedOverlaps, triggerLower]);
    }
  }

  // Bulk variant — adds all new triggers in a single store update so batched "allow all" actions
  // don't fight stale-state in per-trigger loops.
  function allowOverlaps(triggerLowers) {
    const toAdd = triggerLowers.filter((t) => !allowedOverlaps.includes(t));
    if (toAdd.length === 0) return;
    updateAllowedOverlaps([...allowedOverlaps, ...toAdd]);
  }

  function revokeOverlap(triggerLower) {
    updateAllowedOverlaps(allowedOverlaps.filter((t) => t !== triggerLower));
  }

  return { conflictMap, allowedOverlaps, allowOverlap, allowOverlaps, revokeOverlap };
}
