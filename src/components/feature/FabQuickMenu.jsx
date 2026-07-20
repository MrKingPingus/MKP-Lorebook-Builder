// Compact horizontal quick-menu above the FAB. Opens on hover (desktop) or
// long-press (touch). Chips run their action on click; the FAB's own tap still
// adds an entry. A centered "Add to hotbar" button (directly above the FAB)
// enters a pin flow: the real hotbar slots become armable drop targets — click
// a slot to arm it, then click an action chip here to drop it in.
import { useEffect, useRef } from 'react';

export function FabQuickMenu({
  actions,
  onAction,
  onClose,
  onMouseEnter,
  onMouseLeave,
  menuMaxWidth,
  pinMode = false,
  armedSlot = null,
  onEnterPin,
  onExitPin,
  onAssign,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    function onPointerDown(e) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target)) return;
      const fab = document.querySelector('.footer-fab');
      if (fab && fab.contains(e.target)) return;
      // Clicking a hotbar slot while pinning must not dismiss the menu.
      if (e.target.closest && e.target.closest('.hotbar-slot--target')) return;
      onClose();
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [onClose]);

  const armed = armedSlot != null;

  return (
    <div
      ref={menuRef}
      className="fab-quick-menu"
      role="menu"
      style={menuMaxWidth ? { maxWidth: `${menuMaxWidth}px` } : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="fab-quick-menu-actions">
        {actions.map((action) => {
          if (!action) return null;
          const { descriptor, execute, disabled, active } = action;
          function handleClick(e) {
            if (pinMode) { onAssign?.(descriptor.id); return; }
            if (descriptor.confirm && !window.confirm(descriptor.confirm)) return;
            execute(e);
            onAction();
          }
          return (
            <button
              key={descriptor.id}
              className={`fab-quick-menu-chip${active ? ' fab-quick-menu-chip--active' : ''}${pinMode ? ' fab-quick-menu-chip--assign' : ''}`}
              onClick={handleClick}
              disabled={pinMode ? !armed : disabled}
              title={pinMode
                ? (armed ? `Put ${descriptor.label} in the armed slot` : 'Pick a hotbar slot first')
                : descriptor.title}
              role="menuitem"
            >
              <span className="fab-quick-menu-chip-icon">{descriptor.icon}</span>
              <span className="fab-quick-menu-chip-label">{descriptor.label}</span>
            </button>
          );
        })}
      </div>

      <div className="fab-quick-menu-footer">
        {!pinMode ? (
          <button
            className="fab-quick-menu-add"
            onClick={onEnterPin}
            title="Pin an action to a hotbar slot"
          >
            📌 Add to hotbar
          </button>
        ) : (
          <>
            <span className="fab-quick-menu-hint">
              {armed ? 'Slot armed — pick an action' : 'Click a hotbar slot to fill'}
            </span>
            <button className="fab-quick-menu-done" onClick={onExitPin}>Done</button>
          </>
        )}
      </div>
    </div>
  );
}
