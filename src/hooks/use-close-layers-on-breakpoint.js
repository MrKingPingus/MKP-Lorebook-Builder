// Decision 4 of the mobile overhaul: crossing the mobile breakpoint closes
// every open layer.
//
// The problem it solves, found by the 14A sweep: a layer left open across the
// breakpoint becomes something else. The settings panel is a 320px column above
// 768px and a full-screen overlay below, and dragging a desktop window narrow
// reconciles nothing — the user ends up with a full-screen takeover they never
// asked for. The mobile-only layers (entry detail, reference browse, the peek
// overlay) have the mirror problem: above the breakpoint nothing renders the
// surface they belong to.
//
// One rule at the boundary rather than a re-posing branch per layer, because
// re-posing needs an answer for every layer and closing needs none. A layer
// opened before a resize is not one the user is still reading.
//
// Mounted once, in App. Deliberately does not fire on mount — only on an actual
// crossing — so a page that loads at a phone width keeps whatever the app
// restored.
import { useEffect, useRef } from 'react';
import { useMobile }   from './use-mobile.js';
import { useUiStore }  from '../state/ui-store.js';

export function useCloseLayersOnBreakpoint() {
  const isMobile = useMobile();
  const previous = useRef(isMobile);

  useEffect(() => {
    if (previous.current === isMobile) return;
    previous.current = isMobile;
    useUiStore.getState().closeAllLayers();
  }, [isMobile]);
}
