// A standalone way into the templates picker, for where there is no entry to
// hang a ⋯ menu off.
//
// The entry list's empty state is the case this exists for. Templates are
// global and the whole point of them is starting a book that has nothing in it
// yet — but every other route to them runs through a specific entry's menu, so
// a brand-new lorebook was the one place you could not reach your own
// scaffolds. The panel itself is the same component; it just renders with no
// `entry`, which is what drops "Fill this entry" from the load actions.
import { useState, useRef, useCallback } from 'react';
import { TemplatesPopover } from './TemplatesPopover.jsx';

export function TemplatesButton({ label = 'start from a template', className = '' }) {
  const [open, setOpen]     = useState(false);
  const [anchor, setAnchor] = useState(null);
  const btnRef = useRef(null);
  const close  = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        ref={btnRef}
        className={`templates-link ${className}`.trim()}
        onClick={() => {
          if (open) { close(); return; }
          setAnchor(btnRef.current?.getBoundingClientRect() ?? null);
          setOpen(true);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        type="button"
      >
        {label}
      </button>
      <TemplatesPopover
        open={open}
        anchorRect={anchor}
        onClose={close}
        dismissId="templates-empty-state"
        ignoreRef={btnRef}
      />
    </>
  );
}
