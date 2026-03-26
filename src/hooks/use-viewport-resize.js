// Recenters and clamps the floating window whenever the browser viewport is resized
import { useEffect } from 'react';
import { useUiStore } from '../state/ui-store.js';

export function useViewportResize() {
  useEffect(() => {
    function onResize() {
      const { windowSize } = useUiStore.getState();
      const newW = Math.min(windowSize.width,  window.innerWidth);
      const newH = Math.min(windowSize.height, window.innerHeight);
      const x = Math.max(0, Math.round((window.innerWidth  - newW) / 2));
      const y = Math.max(0, Math.round((window.innerHeight - newH) / 2));
      useUiStore.getState().setWindowSize({ width: newW, height: newH });
      useUiStore.getState().setWindowPos({ x, y });
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
}
