// Description textarea with DESCRIPTION label, search highlight overlay, char counter, and resize handle
import { useRef, useState, useCallback, useEffect } from 'react';
import { DescriptionHighlight } from './DescriptionHighlight.jsx';
import { CharCounter }  from '../ui/CharCounter.jsx';
import { useSettings }  from '../../hooks/use-settings.js';
import { useUiStore }   from '../../state/ui-store.js';
import { CHAR_LIMIT }   from '../../constants/limits.js';

const MIN_HEIGHT = 120;
const DEFAULT_HEIGHT = 192; // ~8 rows at 24px

export function DescriptionArea({ value, onChange }) {
  const textareaRef = useRef(null);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const manualHeight = useRef(null); // set when user drags handle; null = auto-grow mode
  const dragStart = useRef(null);
  const { counterTiers, tieredCounterEnabled } = useSettings();
  const searchQuery = useUiStore((s) => s.searchQuery);

  // Auto-grow: expand height to fit content unless user has manually resized
  useEffect(() => {
    if (manualHeight.current !== null) return;
    const el = textareaRef.current;
    if (!el) return;
    // Temporarily shrink to measure scrollHeight
    el.style.height = `${MIN_HEIGHT}px`;
    const scrollH = el.scrollHeight;
    el.style.height = '';
    setHeight(Math.max(MIN_HEIGHT, scrollH));
  }, [value]);

  const onResizePointerDown = useCallback((e) => {
    e.preventDefault();
    dragStart.current = { y: e.clientY, h: height };

    function onMove(me) {
      const newH = Math.max(MIN_HEIGHT, dragStart.current.h + (me.clientY - dragStart.current.y));
      manualHeight.current = newH;
      setHeight(newH);
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [height]);

  return (
    <div className="description-area">
      <div className="field-label">
        DESCRIPTION <span className="field-label-hint">({CHAR_LIMIT} char limit)</span>
      </div>
      <div className="description-wrapper" onPointerDown={(e) => e.stopPropagation()}>
        <DescriptionHighlight
          text={value}
          query={searchQuery}
          style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
        />
        <textarea
          ref={textareaRef}
          className="description-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Entry description…"
          style={{ height: `${height}px` }}
          spellCheck={false}
        />
        <div
          className="description-resize-handle"
          onPointerDown={onResizePointerDown}
          title="Drag to resize"
        />
      </div>
      <div className="description-footer">
        <CharCounter
          count={value.length}
          limit={CHAR_LIMIT}
          tiers={counterTiers}
          tieredEnabled={tieredCounterEnabled}
        />
      </div>
    </div>
  );
}
