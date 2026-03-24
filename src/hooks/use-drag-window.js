// Pointer-event drag logic for the floating window header; writes position to ui-store
import { useCallback } from 'react';
import { useUiStore } from '../state/ui-store.js';

export function useDragWindow() {
  const windowPos = useUiStore((s) => s.windowPos);
  const setWindowPos = useUiStore((s) => s.setWindowPos);

  const onPointerDown = useCallback(
    (e) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);

      const startX = e.clientX - windowPos.x;
      const startY = e.clientY - windowPos.y;

      function onMove(ev) {
        setWindowPos({ x: ev.clientX - startX, y: ev.clientY - startY });
      }

      function onUp(ev) {
        ev.currentTarget?.releasePointerCapture?.(ev.pointerId);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      }

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [windowPos, setWindowPos]
  );

  return { onPointerDown };
}
