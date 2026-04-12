// Single trigger keyword chip with inline editing, × delete, and optional conflict ring + popover
import { useState, useRef } from 'react';
import { createPortal }     from 'react-dom';
import { useMobile }        from '../../hooks/use-mobile.js';
import { useHtmlEscape }    from '../../hooks/use-html-escape.js';
import { useUi }            from '../../hooks/use-ui.js';
import { TypeColorDot }     from './TypeColorDot.jsx';

export function Chip({ label, onDelete, onRename, color, highlight, ringColor, conflictEntries, acknowledged, onAllow, onRevoke }) {
  const { escapeHtml, escapeRegex } = useHtmlEscape();
  const [editing,     setEditing]     = useState(false);
  const [draft,       setDraft]       = useState(label);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverPos,  setPopoverPos]  = useState({ left: 0, bottom: 0 });
  const inputRef    = useRef(null);
  const popoverRef  = useRef(null);
  const chipRef     = useRef(null);
  const hoverTimer  = useRef(null);
  const isMobile    = useMobile();
  const setSearchFocusedId = useUi((s) => s.setSearchFocusedId);

  function startEdit() {
    setDraft(label);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== label) onRename?.(trimmed);
    setEditing(false);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter')  commitEdit();
    if (e.key === 'Escape') setEditing(false);
  }

  function openPopover()  {
    clearTimeout(hoverTimer.current);
    // Compute viewport-relative position of the chip so the portal popover
    // (rendered at document.body, escaping any overflow:hidden ancestors)
    // can be pinned just above the chip regardless of scroll position.
    const el = chipRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setPopoverPos({
        left:   Math.min(rect.left, window.innerWidth - 190), // keep within viewport
        bottom: window.innerHeight - rect.top + 6,
      });
    }
    setPopoverOpen(true);
  }
  function closePopover() {
    hoverTimer.current = setTimeout(() => setPopoverOpen(false), 120);
  }
  function keepPopover()  {
    clearTimeout(hoverTimer.current);
  }

  function navigateToEntry(id) {
    setSearchFocusedId(id);
    setPopoverOpen(false);
    // Defer scroll until after React re-renders the card into its expanded state
    requestAnimationFrame(() => {
      document.getElementById(`entry-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  const borderStyle = ringColor
    ? { boxShadow: `0 0 0 2px ${ringColor}` }
    : color
      ? { borderColor: color }
      : {};

  return (
    <span
      ref={chipRef}
      className="chip"
      style={borderStyle}
      onMouseEnter={conflictEntries ? openPopover  : undefined}
      onMouseLeave={conflictEntries ? closePopover : undefined}
    >
      {editing ? (
        <input
          ref={inputRef}
          className="chip-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={onKeyDown}
        />
      ) : (
        <span
          className="chip-label"
          onClick={isMobile ? startEdit : undefined}
          onDoubleClick={isMobile ? undefined : startEdit}
          {...(highlight
            ? {
                dangerouslySetInnerHTML: {
                  __html: escapeHtml(label).replace(
                    new RegExp(`(${escapeRegex(escapeHtml(highlight))})`, 'gi'),
                    '<mark class="search-mark">$1</mark>'
                  ),
                },
              }
            : {})}
        >
          {highlight ? undefined : label}
        </span>
      )}
      <button className="chip-delete" onClick={onDelete} title="Remove trigger">×</button>

      {/* Conflict popover — rendered via portal to escape overflow:hidden on .entry-card */}
      {conflictEntries && popoverOpen && createPortal(
        <div
          className="chip-conflict-popover"
          style={{ position: 'fixed', left: popoverPos.left, bottom: popoverPos.bottom }}
          ref={popoverRef}
          onMouseEnter={keepPopover}
          onMouseLeave={closePopover}
        >
          <div className="chip-conflict-popover-title">
            {acknowledged ? 'Shared with' : 'Conflict with'}
          </div>
          <div className="chip-conflict-entries">
            {conflictEntries.map((e) => (
              <button
                key={e.id}
                className="chip-conflict-entry"
                onClick={() => navigateToEntry(e.id)}
              >
                <TypeColorDot type={e.type} />
                <span className="chip-conflict-entry-name">{e.name || '(unnamed)'}</span>
              </button>
            ))}
          </div>
          <div className="chip-conflict-popover-divider" />
          {onAllow && (
            <button className="chip-conflict-action chip-conflict-action--allow" onClick={onAllow}>
              Allow overlap
            </button>
          )}
          {onRevoke && (
            <button className="chip-conflict-action chip-conflict-action--revoke" onClick={onRevoke}>
              Revoke
            </button>
          )}
        </div>,
        document.body
      )}
    </span>
  );
}
