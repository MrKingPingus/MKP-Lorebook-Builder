// Recenters and clamps the floating window whenever the browser viewport is resized;
// tracks intended size so the window restores when the viewport grows back
import { useEffect } from 'react';
import { useUiStore } from '../state/ui-store.js';

export function useViewportResize() {
  useEffect(() => {
    let intendedW = null;
    let intendedH = null;

    function onResize() {
      const { windowSize } = useUiStore.getState();
      if (intendedW === null) intendedW = windowSize.width;
      if (intendedH === null) intendedH = windowSize.height;
      if (windowSize.width  > intendedW) intendedW = windowSize.width;
      if (windowSize.height > intendedH) intendedH = windowSize.height;

      const newW = Math.min(intendedW, window.innerWidth);
      const newH = Math.min(intendedH, window.innerHeight);
      const x = Math.max(0, Math.round((window.innerWidth  - newW) / 2));
      const y = Math.max(0, Math.round((window.innerHeight - newH) / 2));
      useUiStore.getState().setWindowSize({ width: newW, height: newH });
      useUiStore.getState().setWindowPos({ x, y });
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
}
