// Corner drag-handle resize logic with viewport boundary clamping; writes size to ui-store
import { useCallback } from 'react';
import { useUiStore }  from '../state/ui-store.js';
import { writeJson }   from '../services/storage-service.js';
import { WINDOW_STATE_KEY }              from '../constants/storage-keys.js';
import { MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT } from '../constants/limits.js';

const MIN_WIDTH  = MIN_WINDOW_WIDTH;
const MIN_HEIGHT = MIN_WINDOW_HEIGHT;

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

        if (corner.includes('e')) { newW = Math.max(MIN_WIDTH,  startW + 2 * dx); }
        if (corner.includes('w')) { newW = Math.max(MIN_WIDTH,  startW - 2 * dx); }
        if (corner.includes('s')) { newH = Math.max(MIN_HEIGHT, startH + 2 * dy); }
        if (corner.includes('n')) { newH = Math.max(MIN_HEIGHT, startH - 2 * dy); }
        // Recompute position from clamped size to preserve center point (prevents drift at min size)
        if (corner.includes('e') || corner.includes('w')) { newX = startPosX + (startW - newW) / 2; }
        if (corner.includes('s') || corner.includes('n')) { newY = startPosY + (startH - newH) / 2; }

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
        // Persist final size and position after resize ends
        // Read committed store values via the module-level ref approach isn't available here,
        // so we recompute from captured start values and the final pointer position.
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        let fW = startW, fH = startH, fX = startPosX, fY = startPosY;
        if (corner.includes('e')) { fW = Math.max(MIN_WIDTH,  startW + 2 * dx); }
        if (corner.includes('w')) { fW = Math.max(MIN_WIDTH,  startW - 2 * dx); }
        if (corner.includes('s')) { fH = Math.max(MIN_HEIGHT, startH + 2 * dy); }
        if (corner.includes('n')) { fH = Math.max(MIN_HEIGHT, startH - 2 * dy); }
        if (corner.includes('e') || corner.includes('w')) { fX = startPosX + (startW - fW) / 2; }
        if (corner.includes('s') || corner.includes('n')) { fY = startPosY + (startH - fH) / 2; }
        fX = Math.max(0, Math.min(fX, window.innerWidth  - MIN_WIDTH));
        fY = Math.max(0, Math.min(fY, window.innerHeight - MIN_HEIGHT));
        if (fX + fW > window.innerWidth)  fW = Math.max(MIN_WIDTH,  window.innerWidth  - fX);
        if (fY + fH > window.innerHeight) fH = Math.max(MIN_HEIGHT, window.innerHeight - fY);
        writeJson(WINDOW_STATE_KEY, { pos: { x: fX, y: fY }, size: { width: fW, height: fH } });
      }

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [windowPos, windowSize, setWindowSize, setWindowPos]
  );

  return { onPointerDown };
}
