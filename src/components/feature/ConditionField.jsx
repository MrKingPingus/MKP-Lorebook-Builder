// The Trigger condition field (CharSnap): label, textarea, counter and hint.
//
// One component for the desktop card and the phone editor, which each carried
// their own copy. The label and counter follow the description's format —
// "(300 char limit)" beside the label, a coloured "39 / 300" underneath — so
// two length-limited boxes in one entry read the same way.
//
// `flash` briefly highlights the field and scrolls it into view. The header's
// condition badge sets it, to answer "what is this icon for" by pointing at
// the thing it stands for.
import { useEffect, useRef } from 'react';
import { useSettings }  from '../../hooks/use-settings.js';
import { CharCounter }  from '../ui/CharCounter.jsx';
import { HOST_LIMITS }  from '../../constants/host.js';
import { CONDITION_WARN_YELLOW_FRACTION, CONDITION_WARN_ORANGE_FRACTION } from '../../constants/limits.js';

const LIMIT = HOST_LIMITS.triggerCondition;
const TIERS = {
  yellow: Math.round(LIMIT * CONDITION_WARN_YELLOW_FRACTION),
  orange: Math.round(LIMIT * CONDITION_WARN_ORANGE_FRACTION),
  red:    LIMIT,
};

// `compact` drops the counter and hint, for compare mode: the reference copy
// beside it has neither, and the two cards line up row for row (#100).
export function ConditionField({ value, onChange, className = '', differs = false, flash = false, compact = false }) {
  const { tieredCounterEnabled, warningScale } = useSettings();
  const ref  = useRef(null);
  const text = value ?? '';

  useEffect(() => {
    if (flash) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [flash]);

  return (
    <div
      ref={ref}
      className={`${className}${differs ? ' entry-field--differs' : ''}${flash ? ' entry-condition-section--flash' : ''}`}
    >
      <div className="field-label">
        {differs && <span className="diff-modified-dot" title="Differs from reference">●</span>}
        TRIGGER CONDITION <span className="field-label-hint">({LIMIT} char limit)</span>
      </div>
      <textarea
        className="entry-condition-field"
        value={text}
        onChange={(e) => onChange(e.target.value.slice(0, LIMIT))}
        placeholder="e.g. {{user}} asks about {{char}}'s childhood"
        rows={2}
        spellCheck={false}
        maxLength={LIMIT}
      />
      {!compact && (<>
      <div className="entry-condition-footer">
        <CharCounter
          count={text.length}
          limit={LIMIT}
          tiers={TIERS}
          tieredEnabled={tieredCounterEnabled}
          warningScale={warningScale}
        />
      </div>
      <div className="entry-condition-hint">
        Plain-language rule for when this entry applies. CharSnap judges it against the recent chat every turn; it works with or without keywords.
      </div>
      </>)}
    </div>
  );
}
