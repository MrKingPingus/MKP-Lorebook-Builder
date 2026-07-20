// Quick-menu popover above the FAB. Opens on hover (desktop) or long-press
// (touch) from the FAB. Tap an item to execute its hotbar action; the FAB's
// own tap still adds an entry. Also hosts an "Add to hotbar" pin flow that pins
// any action to a hotbar slot without a trip through Settings.
import { useEffect, useRef, useState } from 'react';
import { HOTBAR_ACTION_MAP } from '../../constants/hotbar-actions.js';

const SLOT_LABELS = ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'];
const SLOT_ROWS   = [[0, 1, 2], [3, 4, 5]];

export function FabQuickMenu({
  actions,
  onAction,
  onClose,
  onMouseEnter,
  onMouseLeave,
  hotbarSlots = [],
  onPin,
  onStickyChange,
}) {
  const menuRef = useRef(null);
  const [pinMode,   setPinMode]   = useState(false);
  const [pinAction, setPinAction] = useState(null); // action id being placed, or null

  // Pin mode keeps the menu open regardless of hover so the multi-step pin
  // interaction isn't dismissed by a mouse leave.
  useEffect(() => { onStickyChange?.(pinMode); }, [pinMode, onStickyChange]);

  useEffect(() => {
    function onPointerDown(e) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target)) return;
      const fab = document.querySelector('.footer-fab');
      if (fab && fab.contains(e.target)) return;
      onClose();
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [onClose]);

  function exitPinMode() {
    setPinMode(false);
    setPinAction(null);
  }

  function pinToSlot(slotIndex) {
    if (pinAction != null) onPin?.(pinAction, slotIndex);
    setPinAction(null); // stay in pin mode so more actions can be placed
  }

  const pinLabel = pinAction != null ? (HOTBAR_ACTION_MAP[pinAction]?.label ?? pinAction) : null;

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
        const selected = pinMode && pinAction === descriptor.id;
        function handleClick(e) {
          if (pinMode) { setPinAction(descriptor.id); return; }
          if (descriptor.confirm && !window.confirm(descriptor.confirm)) return;
          execute(e);
          onAction();
        }
        return (
          <button
            key={descriptor.id}
            className={`fab-quick-menu-item${active ? ' fab-quick-menu-item--active' : ''}${selected ? ' fab-quick-menu-item--pinning' : ''}`}
            onClick={handleClick}
            disabled={disabled && !pinMode}
            title={pinMode ? `Pin ${descriptor.label} to a slot` : descriptor.title}
            role="menuitem"
          >
            <span className="fab-quick-menu-icon">{descriptor.icon}</span>
            <span className="fab-quick-menu-label">{descriptor.label}</span>
          </button>
        );
      })}

      <div className="fab-quick-menu-divider" />

      {!pinMode ? (
        <button
          className="fab-quick-menu-item fab-quick-menu-pin-toggle"
          onClick={() => setPinMode(true)}
          role="menuitem"
          title="Pin an action to a hotbar slot"
        >
          <span className="fab-quick-menu-icon">📌</span>
          <span className="fab-quick-menu-label">Add to hotbar…</span>
        </button>
      ) : (
        <div className="fab-quick-menu-pin">
          <div className="fab-quick-menu-pin-hint">
            {pinAction == null
              ? 'Pick an action above, then a slot:'
              : <>Pin <strong>{pinLabel}</strong> to a slot:</>}
          </div>
          <div className="fab-quick-menu-slots">
            {SLOT_ROWS.map((row, r) => (
              <div className="fab-quick-menu-slot-row" key={r}>
                {row.map((i) => {
                  const current = hotbarSlots[i];
                  const curLabel = current ? (HOTBAR_ACTION_MAP[current]?.label ?? current) : null;
                  const icon = current ? (HOTBAR_ACTION_MAP[current]?.icon ?? '•') : '+';
                  return (
                    <button
                      key={i}
                      className={`fab-quick-menu-slot${current ? ' fab-quick-menu-slot--filled' : ''}`}
                      onClick={() => pinToSlot(i)}
                      disabled={pinAction == null}
                      title={current ? `${SLOT_LABELS[i]}: ${curLabel} — replace` : `${SLOT_LABELS[i]}: empty`}
                    >
                      <span className="fab-quick-menu-slot-label">{SLOT_LABELS[i]}</span>
                      <span className="fab-quick-menu-slot-icon">{icon}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <button className="fab-quick-menu-pin-done" onClick={exitPinMode}>Done</button>
        </div>
      )}
    </div>
  );
}
