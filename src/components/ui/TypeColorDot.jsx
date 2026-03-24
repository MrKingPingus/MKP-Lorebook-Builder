// Colored type stripe or dot indicator rendered in the entry card header for visual type identification
import { ENTRY_TYPES } from '../../constants/entry-types.js';

export function TypeColorDot({ type }) {
  const def   = ENTRY_TYPES.find((t) => t.id === type);
  const color = def?.color ?? '#9ba1ad';
  return <span className="type-color-dot" style={{ background: color }} title={def?.label} />;
}
