// Four corner drag handle elements — each wired to use-resize-window with its corner identifier
import { useResizeWindow } from '../../hooks/use-resize-window.js';

const CORNERS = ['nw', 'ne', 'sw', 'se'];

export function ResizeHandles() {
  const { onPointerDown } = useResizeWindow();

  return (
    <>
      {CORNERS.map((corner) => (
        <div
          key={corner}
          className={`resize-handle resize-handle--${corner}`}
          onPointerDown={(e) => onPointerDown(corner, e)}
        />
      ))}
    </>
  );
}
