// Unified hotbar — 3 configurable slots, pinned + FAB, 3 configurable slots; renders on both platforms
import { useHotbarActions } from '../../hooks/use-hotbar-actions.js';
import { useUi }            from '../../hooks/use-ui.js';
import { useMobile }        from '../../hooks/use-mobile.js';
import { useSettings }      from '../../hooks/use-settings.js';

const FAB_SIZES = { small: 44, medium: 54, large: 64 };

function HotbarSlot({ action }) {
  if (!action) {
    return <div className="hotbar-slot hotbar-slot--empty" aria-hidden="true" />;
  }

  const { descriptor, execute, disabled, active } = action;

  function handleClick() {
    if (descriptor.confirm) {
      if (!window.confirm(descriptor.confirm)) return;
    }
    execute();
  }

  return (
    <button
      className={`footer-btn${active ? ' footer-btn--active' : ''}`}
      onClick={handleClick}
      disabled={disabled}
      title={descriptor.title}
    >
      <span className="hotbar-slot-icon">{descriptor.icon} </span>
      <span className="hotbar-slot-text">{descriptor.label}</span>
    </button>
  );
}

export function Hotbar() {
  const { slots, addEntry }           = useHotbarActions();
  const isMobile                      = useMobile();
  const activeMenuPanel               = useUi((s) => s.activeMenuPanel);
  const { fabSize, fabCustomSize }    = useSettings();

  const leftSlots  = slots.slice(0, 3);
  const rightSlots = slots.slice(3, 6);

  const fabPx       = fabSize === 'custom' ? fabCustomSize : (FAB_SIZES[fabSize] ?? 64);
  const fabFontSize = `${Math.round(fabPx * 0.45)}px`;

  const fabStyle = {
    width:    fabPx,
    height:   fabPx,
    fontSize: fabFontSize,
    ...(isMobile && activeMenuPanel ? { display: 'none' } : {}),
  };

  return (
    <div className="hotbar">
      <div className="hotbar-group">
        {leftSlots.map((action, i) => (
          <HotbarSlot key={`left-${i}`} action={action} />
        ))}
      </div>

      <button
        className="footer-fab"
        onClick={addEntry}
        title="Add entry (Alt+N)"
        style={fabStyle}
      >
        +
      </button>

      <div className="hotbar-group hotbar-group--right">
        {rightSlots.map((action, i) => (
          <HotbarSlot key={`right-${i}`} action={action} />
        ))}
      </div>
    </div>
  );
}
