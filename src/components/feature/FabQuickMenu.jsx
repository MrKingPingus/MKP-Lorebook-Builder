// Quick-menu popover above the FAB. Opens on hover (desktop) or long-press
// (touch) from the FAB. Tap an item to execute its hotbar action; the FAB's
// own tap still adds an entry. Click-outside closes on mobile; desktop relies
// on the hover bridge (mouse enter/leave handlers on this popover).
import { useEffect, useRef } from 'react';

export function FabQuickMenu({
  actions,
  onAction,
  onClose,
  onMouseEnter,
  onMouseLeave,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    function onPointerDown(e) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target)) return;
      // Don't auto-close when the user re-taps the FAB itself — let the FAB's
      // own handlers decide (re-open, suppress click, or fire Add Entry).
      const fab = document.querySelector('.footer-fab');
      if (fab && fab.contains(e.target)) return;
      onClose();
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fab-quick-menu"
      role="menu"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {actions.map((action) => {
        if (!action) return null;
        const { descriptor, execute, disabled, active } = action;
        function handleClick(e) {
          if (descriptor.confirm && !window.confirm(descriptor.confirm)) return;
          execute(e);
          onAction();
        }
        return (
          <button
            key={descriptor.id}
            className={`fab-quick-menu-item${active ? ' fab-quick-menu-item--active' : ''}`}
            onClick={handleClick}
            disabled={disabled}
            title={descriptor.title}
            role="menuitem"
          >
            <span className="fab-quick-menu-icon">{descriptor.icon}</span>
            <span className="fab-quick-menu-label">{descriptor.label}</span>
          </button>
        );
      })}
    </div>
  );
}
