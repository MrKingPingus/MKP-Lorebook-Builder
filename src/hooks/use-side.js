// Tells side-aware hooks which lorebook slot they're reading from.
// Default is null — no explicit side — which hooks interpret as "use the
// focused slot" (activeLorebookId). Inside a SideContext.Provider the value
// is 'left' or 'right', targeting that slot's lorebook directly.
import { createContext, useContext } from 'react';
import { useLorebookStore } from '../state/lorebook-store.js';

export const SideContext = createContext(null);

export function useSide() {
  return useContext(SideContext);
}

// Resolves to the lorebook id for the current side context.
// 'left' → leftId, 'right' → rightId, null → activeLorebookId (focused slot).
export function useSideLorebookId() {
  const side             = useContext(SideContext);
  const activeLorebookId = useLorebookStore((s) => s.activeLorebookId);
  const leftId           = useLorebookStore((s) => s.leftId);
  const rightId          = useLorebookStore((s) => s.rightId);
  if (side === 'left')  return leftId;
  if (side === 'right') return rightId;
  return activeLorebookId;
}
