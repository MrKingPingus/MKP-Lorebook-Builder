// Auto-growing textarea for entry description with a draggable manual resize handle at the bottom
import { useRef, useEffect } from 'react';
import { DescriptionHighlight } from './DescriptionHighlight.jsx';
import { CharCounter } from '../ui/CharCounter.jsx';
import { useSettings } from '../../hooks/use-settings.js';
import { useUiStore } from '../../state/ui-store.js';

export function DescriptionArea({ value, onChange, entryId }) {
  const textareaRef = useRef(null);
  const { counterTiers } = useSettings();
  const searchQuery = useUiStore((s) => s.searchQuery);

  // Auto-grow
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [value]);

  return (
    <div className="description-area">
      <div className="description-wrapper">
        <DescriptionHighlight
          text={value}
          query={searchQuery}
          style={{
            font:        'inherit',
            fontSize:    'inherit',
            lineHeight:  'inherit',
            letterSpacing: 'inherit',
            whiteSpace:  'pre-wrap',
            wordWrap:    'break-word',
          }}
        />
        <textarea
          ref={textareaRef}
          className="description-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Entry description…"
          rows={3}
          spellCheck={false}
        />
      </div>
      <CharCounter count={value.length} tiers={counterTiers} />
    </div>
  );
}
