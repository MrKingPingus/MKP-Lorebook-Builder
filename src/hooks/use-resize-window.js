// Corner drag-handle resize logic with viewport boundary clamping; writes size to ui-store
import { useCallback } from 'react';
import { useUiStore } from '../state/ui-store.js';

const MIN_WIDTH  = 400;
const MIN_HEIGHT = 300;

export function useResizeWindow() {
  const windowPos  = useUiStore((s) => s.windowPos);
  const windowSize = useUiStore((s) => s.windowSize);
  const setWindowSize = useUiStore((s) => s.setWindowSize);
  const setWindowPos  = useUiStore((s) => s.setWindowPos);

  const onPointerDown = useCallback(
    (corner, e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      const startX = e.clientX;
      const startY = e.clientY;
      const startW = windowSize.width;
      const startH = windowSize.height;
      const startPosX = windowPos.x;
      const startPosY = windowPos.y;

      function onMove(ev) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        let newW = startW;
        let newH = startH;
        let newX = startPosX;
        let newY = startPosY;

        if (corner.includes('e')) { newW = Math.max(MIN_WIDTH,  startW + 2 * dx); newX = startPosX - dx; }
        if (corner.includes('w')) { newW = Math.max(MIN_WIDTH,  startW - 2 * dx); newX = startPosX + dx; }
        if (corner.includes('s')) { newH = Math.max(MIN_HEIGHT, startH + 2 * dy); newY = startPosY - dy; }
        if (corner.includes('n')) { newH = Math.max(MIN_HEIGHT, startH - 2 * dy); newY = startPosY + dy; }

        // Clamp position to viewport
        newX = Math.max(0, Math.min(newX, window.innerWidth  - MIN_WIDTH));
        newY = Math.max(0, Math.min(newY, window.innerHeight - MIN_HEIGHT));

        // Clamp size so opposite edges stay within viewport
        if (newX + newW > window.innerWidth)  newW = Math.max(MIN_WIDTH,  window.innerWidth  - newX);
        if (newY + newH > window.innerHeight) newH = Math.max(MIN_HEIGHT, window.innerHeight - newY);

        setWindowSize({ width: newW, height: newH });
        setWindowPos({ x: newX, y: newY });
      }

      function onUp(ev) {
        ev.currentTarget?.releasePointerCapture?.(ev.pointerId);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      }

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [windowPos, windowSize, setWindowSize, setWindowPos]
  );

  return { onPointerDown };
}
