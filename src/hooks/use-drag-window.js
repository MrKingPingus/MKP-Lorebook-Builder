// Pointer-event drag logic for the floating window header; writes position to ui-store
import { useCallback } from 'react';
import { useUiStore } from '../state/ui-store.js';

export function useDragWindow() {
  const windowPos  = useUiStore((s) => s.windowPos);
  const windowSize = useUiStore((s) => s.windowSize);
  const setWindowPos = useUiStore((s) => s.setWindowPos);

  const onPointerDown = useCallback(
    (e) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);

      const startX = e.clientX - windowPos.x;
      const startY = e.clientY - windowPos.y;
      // Snapshot size at drag start to avoid stale closure in listeners
      const snapW = windowSize.width;
      const snapH = windowSize.height;

      function onMove(ev) {
        const rawX = ev.clientX - startX;
        const rawY = ev.clientY - startY;
        setWindowPos({
          x: Math.max(0, Math.min(rawX, window.innerWidth  - snapW)),
          y: Math.max(0, Math.min(rawY, window.innerHeight - snapH)),
        });
      }

      function onUp(ev) {
        ev.currentTarget?.releasePointerCapture?.(ev.pointerId);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      }

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [windowPos, windowSize, setWindowPos]
  );

  return { onPointerDown };
}
