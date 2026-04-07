// Description textarea with DESCRIPTION label, search highlight overlay, and char counter
import { useRef, useLayoutEffect } from 'react';
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

  // Blue border when override is active; otherwise tiered yellow/red
  const tieredBorderStyle = (() => {
    if (ignoreLimitWarning && overYellow) return { borderColor: 'var(--blue)' };
    if (!tieredCounterEnabled) return {};
    if (value.length >= CHAR_WARN_RED)    return { borderColor: 'var(--red)' };
    if (value.length >= CHAR_WARN_YELLOW) return { borderColor: 'var(--yellow)' };
    return {};
  })();

  // Autogrow: after every render where value has changed, resize to content
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

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
            className={`override-pill${ignoreLimitWarning ? ' override-pill--active' : ''}`}
            onClick={onToggleLimitWarning}
            title={ignoreLimitWarning ? 'Limit override on — click to re-enable warnings' : 'Ignore the character limit warning for this entry'}
          >
            {ignoreLimitWarning ? 'limit ignored' : 'ignore limit'}
          </button>
        )}
      </div>
    </div>
  );
}
