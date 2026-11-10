// A text link that opens the Templates manager with no entry behind it.
//
// It exists for the empty entry list: an empty book is exactly where templates
// earn their keep, and it was the one place with no route to them, since every
// other way in hangs off an entry's ⋯ menu.
import { useUi } from '../../hooks/use-ui.js';

export function TemplatesButton({ label = 'start from a template', className = '' }) {
  const openTemplatesManager = useUi((s) => s.openTemplatesManager);
  return (
    <button
      type="button"
      className={`templates-link${className ? ` ${className}` : ''}`}
      onClick={() => openTemplatesManager(null)}
    >
      {label}
    </button>
  );
}
