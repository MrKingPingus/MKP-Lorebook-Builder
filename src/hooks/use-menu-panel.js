// Handles FloatingWindow expansion/collapse and horizontal re-centering when the desktop menu panel opens or closes
import { useEffect, useRef } from 'react';
import { useUiStore }        from '../state/ui-store.js';
import { useMobile }         from './use-mobile.js';
import { MENU_PANEL_WIDTH }  from '../constants/limits.js';

export function useMenuPanel() {
  const isMobile        = useMobile();
  const activeMenuPanel = useUiStore((s) => s.activeMenuPanel);
  const savedWRef       = useRef(null); // build-only width saved before panel opened

  useEffect(() => {
    if (isMobile) return;

    const { windowSize, windowPos, setWindowSize, setWindowPos } = useUiStore.getState();

    if (activeMenuPanel !== null && savedWRef.current === null) {
      // Opening: save current build width, expand window, re-center
      savedWRef.current = windowSize.width;
      const totalW = Math.min(windowSize.width + MENU_PANEL_WIDTH, window.innerWidth);
      const newX   = Math.max(0, (window.innerWidth - totalW) / 2);
      setWindowSize({ width: totalW, height: windowSize.height });
      setWindowPos({ x: newX, y: windowPos.y });
    } else if (activeMenuPanel === null && savedWRef.current !== null) {
      // Closing: restore build width, re-center.
      // Clamp to the current viewport in case it shrank while the panel was
      // open (e.g. user changed browser zoom). Without the clamp, we'd
      // restore the pre-open width verbatim and the window would end up
      // wider than window.innerWidth — content stretches off the right edge.
      const restoredW = Math.min(savedWRef.current, window.innerWidth);
      savedWRef.current = null;
      const { windowPos: currentPos, windowSize: currentSize } = useUiStore.getState();
      const restoredH = Math.min(currentSize.height, window.innerHeight);
      const newX = Math.max(0, (window.innerWidth  - restoredW) / 2);
      const newY = Math.max(0, Math.min(currentPos.y, window.innerHeight - restoredH));
      setWindowSize({ width: restoredW, height: restoredH });
      setWindowPos({ x: newX, y: newY });
    }
    // Switching between open panels (null→id handled above, id→same-id is a toggle→null,
    // id→different-id: savedWRef is set so neither branch fires — no resize needed)
  }, [activeMenuPanel, isMobile]);
}
