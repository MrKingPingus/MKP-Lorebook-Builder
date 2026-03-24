// Description textarea with DESCRIPTION label, fixed height, search highlight, and char counter
import { useRef } from 'react';
import { DescriptionHighlight } from './DescriptionHighlight.jsx';
import { CharCounter }  from '../ui/CharCounter.jsx';
import { useSettings }  from '../../hooks/use-settings.js';
import { useUiStore }   from '../../state/ui-store.js';
import { CHAR_LIMIT }   from '../../constants/limits.js';

export function DescriptionArea({ value, onChange }) {
  const textareaRef = useRef(null);
  const { counterTiers } = useSettings();
  const searchQuery = useUiStore((s) => s.searchQuery);

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
          rows={8}
          spellCheck={false}
        />
      </div>
      <div className="description-footer">
        <CharCounter count={value.length} limit={CHAR_LIMIT} tiers={counterTiers} />
      </div>
    </div>
  );
}
