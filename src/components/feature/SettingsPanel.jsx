// Settings tab content — all user preference controls: window size, counter tiers, compact mode, hotkey
import { useSettings } from '../../hooks/use-settings.js';

export function SettingsPanel() {
  const {
    compactTriggerMode,
    counterTiers,
    defaultWindowWidth,
    defaultWindowHeight,
    setCompactTriggerMode,
    setCounterTiers,
    setDefaultWindowWidth,
    setDefaultWindowHeight,
  } = useSettings();

  return (
    <div className="settings-panel">
      <div className="settings-group">
        <label className="settings-label">
          <span>Compact trigger mode</span>
          <input
            type="checkbox"
            checked={compactTriggerMode}
            onChange={(e) => setCompactTriggerMode(e.target.checked)}
          />
        </label>
        <div className="settings-hint">
          Show triggers as a single text field instead of individual chips.
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

      <div className="settings-group">
        <div className="settings-label">Default window size</div>
        <div className="settings-row">
          <label>
            Width
            <input
              type="number"
              min={400}
              value={defaultWindowWidth}
              onChange={(e) => setDefaultWindowWidth(Number(e.target.value))}
            />
          </label>
          <label>
            Height
            <input
              type="number"
              min={300}
              value={defaultWindowHeight}
              onChange={(e) => setDefaultWindowHeight(Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-label">Keyboard shortcuts</div>
        <div className="settings-hint">
          <kbd>Alt+N</kbd> New entry &nbsp;·&nbsp;
          <kbd>Ctrl+Z</kbd> Undo &nbsp;·&nbsp;
          <kbd>Ctrl+Shift+Z</kbd> Redo
        </div>
      </div>
    </div>
  );
}
