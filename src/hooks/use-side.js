// Tells side-aware hooks which lorebook slot they're reading from.
// Components outside any SideContext.Provider default to 'left', which
// matches single-slot mode where the "focused side" is always the only side.
import { createContext, useContext } from 'react';

export const SideContext = createContext('left');

export function useSide() {
  return useContext(SideContext);
}
