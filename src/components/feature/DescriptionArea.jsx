// Description textarea with DESCRIPTION label, search highlight overlay, and char counter
import { useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { DescriptionHighlight } from './DescriptionHighlight.jsx';
import { CharCounter }  from '../ui/CharCounter.jsx';
import { useSettings }  from '../../hooks/use-settings.js';
import { useUi }        from '../../hooks/use-ui.js';
import { CHAR_LIMIT, CHAR_WARN_YELLOW, CHAR_WARN_RED } from '../../constants/limits.js';

export function DescriptionArea({ value, onChange, ignoreLimitWarning = false, onToggleLimitWarning }) {
  const textareaRef = useRef(null);
  const { counterTiers, tieredCounterEnabled } = useSettings();
  const searchQuery = useUi((s) => s.searchQuery);

  const overYellow = value.length >= CHAR_WARN_YELLOW;
  const overRed    = value.length >= CHAR_WARN_RED;
  const pillTier   = overRed ? 'red' : 'yellow';

  // Blue border when override is active; otherwise tiered yellow/red
  const tieredBorderStyle = (() => {
    if (ignoreLimitWarning && overYellow) return { borderColor: 'var(--blue)' };
    if (!tieredCounterEnabled) return {};
    if (value.length >= CHAR_WARN_RED)    return { borderColor: 'var(--red)' };
    if (value.length >= CHAR_WARN_YELLOW) return { borderColor: 'var(--yellow)' };
    return {};
  })();

  // Autogrow: resize the textarea to fit its content.
  //
  // Three things we have to get right to avoid content spilling outside the
  // border on large pastes/imports (typing works fine even without them
  // because small deltas hide the errors):
  //   1. border-box math — the textarea uses box-sizing: border-box, so
  //      style.height is the BORDER box height, but scrollHeight excludes
  //      borders. `height = scrollHeight` leaves the content area short by
  //      borderTop + borderBottom; the last line clips.
  //   2. stale layout on large value changes — after a big value change
  //      some browsers hand back a scrollHeight that hasn't fully reflected
  //      the new wrapping until layout is flushed. Reading offsetHeight
  //      between the reset and the measure forces the flush.
  //   3. width changes after the first measure — during import, the parent
  //      panel can still be settling into its final width when the effect
  //      runs. If we only measure once per value change, the stored height
  //      is wrong for the final width. ResizeObserver re-measures whenever
  //      the textarea's width actually changes.
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // eslint-disable-next-line no-unused-expressions
    el.offsetHeight; // force reflow so scrollHeight reflects the new wrap
    const cs = window.getComputedStyle(el);
    const border = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    el.style.height = `${el.scrollHeight + border}px`;
  }, []);

  useLayoutEffect(() => {
    resize();
  }, [value, resize]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    let lastWidth = el.clientWidth;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w === lastWidth) return;
      lastWidth = w;
      resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [resize]);

  return (
    <div className="description-area">
      <div className="field-label">
        DESCRIPTION <span className="field-label-hint">({CHAR_LIMIT} char limit)</span>
      </div>
      <div className="description-wrapper">
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
          spellCheck={false}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={tieredBorderStyle}
        />
      </div>
      <div className="description-footer">
        <CharCounter
          count={value.length}
          limit={CHAR_LIMIT}
          tiers={counterTiers}
          tieredEnabled={tieredCounterEnabled}
        />
        {overYellow && onToggleLimitWarning && (
          <button
            className={`override-pill override-pill--${ignoreLimitWarning ? 'active' : pillTier}`}
            onClick={onToggleLimitWarning}
            title={ignoreLimitWarning ? 'Limit override on — click to re-enable warnings' : 'Ignore the character limit warning for this entry'}
          >
            {ignoreLimitWarning ? 'Limit Ignored' : 'Ignore Limit'}
          </button>
        )}
      </div>
    </div>
  );
}
