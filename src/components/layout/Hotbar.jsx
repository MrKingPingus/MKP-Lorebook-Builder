// Unified hotbar — 3 configurable slots, pinned + FAB, 3 configurable slots; renders on both platforms
import { useHotbarActions } from '../../hooks/use-hotbar-actions.js';

function HotbarSlot({ action }) {
  if (!action) {
    return <div className="hotbar-slot hotbar-slot--empty" aria-hidden="true" />;
  }

  const { descriptor, execute, disabled } = action;

  function handleClick() {
    if (descriptor.confirm) {
      if (!window.confirm(descriptor.confirm)) return;
    }
    execute();
  }

  return (
    <button
      className="footer-btn"
      onClick={handleClick}
      disabled={disabled}
      title={descriptor.title}
    >
      {descriptor.icon} {descriptor.label}
    </button>
  );
}

export function Hotbar() {
  const { slots, addEntry } = useHotbarActions();

  const leftSlots  = slots.slice(0, 3);
  const rightSlots = slots.slice(3, 6);

  return (
    <div className="hotbar">
      <div className="hotbar-group">
        {leftSlots.map((action, i) => (
          <HotbarSlot key={action?.descriptor.id ?? `left-${i}`} action={action} />
        ))}
      </div>

      <button
        className="footer-fab"
        onClick={addEntry}
        title="Add entry (Alt+N)"
      >
        +
      </button>

      <div className="hotbar-group hotbar-group--right">
        {rightSlots.map((action, i) => (
          <HotbarSlot key={action?.descriptor.id ?? `right-${i}`} action={action} />
        ))}
      </div>
    </div>
  );
}
