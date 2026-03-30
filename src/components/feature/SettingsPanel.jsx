// Settings tab content — all user preference controls
import { useSettings }    from '../../hooks/use-settings.js';
import { HOTBAR_ACTIONS } from '../../constants/hotbar-actions.js';
import { MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT } from '../../constants/limits.js';

export function SettingsPanel() {
  const {
    counterTiers,
    defaultWindowWidth,
    defaultWindowHeight,
    tieredCounterEnabled,
    hideSuggestionsByDefault,
    hideEntryStats,
    newEntryHotkey,
    hotbarSlots,
    resetWindow,
    setCounterTiers,
    setDefaultWindowWidth,
    setDefaultWindowHeight,
    setTieredCounterEnabled,
    setHideSuggestionsByDefault,
    setHideEntryStats,
    setNewEntryHotkey,
    setHotbarSlots,
  } = useSettings();

  function updateSlot(index, value) {
    const next = [...hotbarSlots];
    next[index] = value || null;
    setHotbarSlots(next);
  }

  return (
    <div className="settings-panel">

      {/* ── Suggestions tray ── */}
      <div className="settings-group">
        <label className="settings-label">
          <span>Suggestions collapsed by default</span>
          <input
            type="checkbox"
            checked={hideSuggestionsByDefault}
            onChange={(e) => setHideSuggestionsByDefault(e.target.checked)}
          />
        </label>
        <div className="settings-hint">
          Start every entry's suggestion tray in the collapsed state.
        </div>
      </div>

      {/* ── Entry stats ── */}
      <div className="settings-group">
        <label className="settings-label">
          <span>Hide entry stats badges</span>
          <input
            type="checkbox"
            checked={hideEntryStats}
            onChange={(e) => setHideEntryStats(e.target.checked)}
          />
        </label>
        <div className="settings-hint">
          Hides the trigger count and character count badges in entry headers.
        </div>
      </div>

      {/* ── Character counter ── */}
      <div className="settings-group">
        <label className="settings-label">
          <span>Tiered character counter colors</span>
          <input
            type="checkbox"
            checked={tieredCounterEnabled}
            onChange={(e) => setTieredCounterEnabled(e.target.checked)}
          />
        </label>
        <div className="settings-hint">
          Color-code the character counter green / yellow / red by threshold.
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-label">Character count thresholds</div>
        <div className="settings-row">
          <label>
            Yellow at
            <input
              type="number"
              min={0}
              value={counterTiers.yellow}
              onChange={(e) =>
                setCounterTiers({ ...counterTiers, yellow: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Red at
            <input
              type="number"
              min={0}
              value={counterTiers.red}
              onChange={(e) =>
                setCounterTiers({ ...counterTiers, red: Number(e.target.value) })
              }
            />
          </label>
        </div>
      </div>

      {/* ── Window size ── */}
      <div className="settings-group">
        <div className="settings-label">Default window size</div>
        <div className="settings-row">
          <label>
            Width
            <input
              type="number"
              min={MIN_WINDOW_WIDTH}
              value={defaultWindowWidth}
              onChange={(e) => setDefaultWindowWidth(Number(e.target.value))}
            />
          </label>
          <label>
            Height
            <input
              type="number"
              min={MIN_WINDOW_HEIGHT}
              value={defaultWindowHeight}
              onChange={(e) => setDefaultWindowHeight(Number(e.target.value))}
            />
          </label>
        </div>
        <button className="settings-reset-btn" onClick={resetWindow}>
          Reset window to default size
        </button>
      </div>

      {/* ── Hotkey ── */}
      <div className="settings-group">
        <div className="settings-label">New entry hotkey</div>
        <div className="settings-row settings-row--hotkey">
          <span className="settings-hint">Alt +</span>
          <input
            type="text"
            className="hotkey-input"
            maxLength={1}
            value={newEntryHotkey}
            onChange={(e) => {
              const v = e.target.value.toLowerCase();
              if (v) setNewEntryHotkey(v);
            }}
          />
        </div>
        <div className="settings-hint">
          <kbd>Alt+{newEntryHotkey.toUpperCase()}</kbd> New entry &nbsp;·&nbsp;
          <kbd>Ctrl+Z</kbd> Undo &nbsp;·&nbsp;
          <kbd>Ctrl+Y</kbd> Redo
        </div>
      </div>

      {/* ── Hotbar slots ── */}
      <div className="settings-group">
        <div className="settings-label">Hotbar slots</div>
        <div className="settings-hint">
          6 slots flank the + button (3 left, 3 right). Choose an action or leave empty.
        </div>
        <div className="hotbar-slot-config">
          {hotbarSlots.map((slotId, i) => (
            <label key={i} className="hotbar-slot-row">
              <span className="hotbar-slot-label">
                {i < 3 ? `Left ${i + 1}` : `Right ${i - 2}`}
              </span>
              <select
                className="hotbar-slot-select"
                value={slotId ?? ''}
                onChange={(e) => updateSlot(i, e.target.value)}
              >
                <option value="">(empty)</option>
                {HOTBAR_ACTIONS.map((action) => (
                  <option key={action.id} value={action.id}>
                    {action.icon} {action.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

    </div>
  );
}
