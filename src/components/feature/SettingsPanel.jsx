// Settings tab content — all user preference controls
import { useSettings }       from '../../hooks/use-settings.js';
import { useRollbackConfig } from '../../hooks/use-rollback.js';
import { HOTBAR_ACTIONS }    from '../../constants/hotbar-actions.js';
import { MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT, ROLLBACK_SNAPSHOT_WARN, ROLLBACK_MAX_CUSTOM } from '../../constants/limits.js';

export function SettingsPanel() {
  const {
    counterTiers,
    defaultWindowWidth,
    defaultWindowHeight,
    tieredCounterEnabled,
    hideSuggestionsByDefault,
    hideEntryStats,
    newEntryHotkey,
    undoHotkey,
    redoHotkey,
    hotbarSlots,
    entryTypeView,
    fabSize,
    fabCustomSize,
    resetWindow,
    setCounterTiers,
    setDefaultWindowWidth,
    setDefaultWindowHeight,
    setTieredCounterEnabled,
    setHideSuggestionsByDefault,
    setHideEntryStats,
    setNewEntryHotkey,
    setUndoHotkey,
    setRedoHotkey,
    setHotbarSlots,
    setEntryTypeView,
    setFabSize,
    setFabCustomSize,
    rollbackDefaultEnabled,
    setRollbackDefaultEnabled,
    keepMenuOpenAfterImport,
    setKeepMenuOpenAfterImport,
  } = useSettings();

  const {
    rollbackEnabled,
    snapshotCount,
    autoSnapshot,
    setRollbackEnabled,
    setSnapshotCount,
    setAutoSnapshot,
  } = useRollbackConfig();

  function updateSlot(index, value) {
    const next = [...hotbarSlots];
    next[index] = value || null;
    setHotbarSlots(next);
  }

  return (
    <div className="settings-panel">

      {/* ── Rollback ── */}
      <div className="settings-group">
        <label className="settings-label">
          <span>Entry rollback (this lorebook)</span>
          <input
            type="checkbox"
            checked={rollbackEnabled}
            onChange={(e) => setRollbackEnabled(e.target.checked)}
          />
        </label>
        <div className="settings-hint">
          When on, a snapshot of each entry is saved before its first edit each session. Snapshots can be restored from the entry card.
        </div>

        {rollbackEnabled && (
          <>
            <div className="settings-label" style={{ marginTop: 4 }}>Snapshots to keep per entry</div>
            <div className="settings-row">
              <select
                className="hotbar-slot-select"
                value={[1, 3, 5].includes(snapshotCount) ? String(snapshotCount) : 'custom'}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    // Only jump to default custom value if coming from a preset;
                    // if already custom, leave the existing value alone
                    if ([1, 3, 5].includes(snapshotCount)) setSnapshotCount(7);
                  } else {
                    setSnapshotCount(Number(e.target.value));
                  }
                }}
              >
                <option value="1">1</option>
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="custom">Go with God</option>
              </select>
              {![1, 3, 5].includes(snapshotCount) && (
                <input
                  type="number"
                  min={1}
                  max={ROLLBACK_MAX_CUSTOM}
                  value={snapshotCount}
                  onChange={(e) => setSnapshotCount(Math.min(ROLLBACK_MAX_CUSTOM, Math.max(1, Number(e.target.value))))}
                  style={{ width: 60 }}
                />
              )}
            </div>
            {snapshotCount > ROLLBACK_SNAPSHOT_WARN && (
              <div className="settings-hint" style={{ color: 'var(--yellow)' }}>
                Storing more than {ROLLBACK_SNAPSHOT_WARN} snapshots per entry may noticeably increase localStorage usage on large lorebooks.
              </div>
            )}
            <label className="settings-label" style={{ marginTop: 4 }}>
              <span>Auto-snapshot on first edit</span>
              <input
                type="checkbox"
                checked={autoSnapshot}
                onChange={(e) => setAutoSnapshot(e.target.checked)}
              />
            </label>
            <div className="settings-hint">
              When off, snapshots are only created manually via the entry's Rollback panel. The save prompt on close still appears.
            </div>
          </>
        )}
      </div>

      <div className="settings-group">
        <label className="settings-label">
          <span>Enable rollback for new lorebooks by default</span>
          <input
            type="checkbox"
            checked={rollbackDefaultEnabled}
            onChange={(e) => setRollbackDefaultEnabled(e.target.checked)}
          />
        </label>
        <div className="settings-hint">
          New lorebooks will start with rollback turned on automatically.
        </div>
      </div>

      {/* ── Menu behavior ── */}
      <div className="settings-group">
        <label className="settings-label">
          <span>Keep menu tab open after importing (desktop)</span>
          <input
            type="checkbox"
            checked={keepMenuOpenAfterImport}
            onChange={(e) => setKeepMenuOpenAfterImport(e.target.checked)}
          />
        </label>
        <div className="settings-hint">
          When on, the menu panel stays open after a successful import. On mobile the menu always closes (full-screen overlay).
        </div>
      </div>

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
          <span>Tiered counter colors (description &amp; triggers)</span>
          <input
            type="checkbox"
            checked={tieredCounterEnabled}
            onChange={(e) => setTieredCounterEnabled(e.target.checked)}
          />
        </label>
        <div className="settings-hint">
          Color-code the description and trigger counters green / yellow / red by threshold. When disabled, counters show green.
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

      {/* ── Hotkeys ── */}
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
      </div>

      <div className="settings-group">
        <div className="settings-label">Undo hotkey</div>
        <div className="settings-row settings-row--hotkey">
          <span className="settings-hint">Ctrl +</span>
          <input
            type="text"
            className="hotkey-input"
            maxLength={1}
            value={undoHotkey}
            onChange={(e) => {
              const v = e.target.value.toLowerCase();
              if (v) setUndoHotkey(v);
            }}
          />
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-label">Redo hotkey</div>
        <div className="settings-row settings-row--hotkey">
          <span className="settings-hint">Ctrl +</span>
          <input
            type="text"
            className="hotkey-input"
            maxLength={1}
            value={redoHotkey}
            onChange={(e) => {
              const v = e.target.value.toLowerCase();
              if (v) setRedoHotkey(v);
            }}
          />
        </div>
        <div className="settings-hint">
          <kbd>Alt+{newEntryHotkey.toUpperCase()}</kbd> New entry &nbsp;·&nbsp;
          <kbd>Ctrl+{undoHotkey.toUpperCase()}</kbd> Undo &nbsp;·&nbsp;
          <kbd>Ctrl+{redoHotkey.toUpperCase()}</kbd> Redo
        </div>
      </div>

      {/* ── Entry type selector style (mobile detail panel) ── */}
      <div className="settings-group">
        <label className="settings-label">
          <span>Full type button grid in entry editor</span>
          <input
            type="checkbox"
            checked={entryTypeView === 'buttons'}
            onChange={(e) => setEntryTypeView(e.target.checked ? 'buttons' : 'dropdown')}
          />
        </label>
        <div className="settings-hint">
          Shows large type buttons instead of a compact dropdown when editing an entry. (Currently broken — has no visible effect.)
        </div>
      </div>

      {/* ── FAB button size ── */}
      <div className="settings-group">
        <div className="settings-label">FAB button size</div>
        <select
          className="hotbar-slot-select"
          value={fabSize}
          onChange={(e) => setFabSize(e.target.value)}
        >
          <option value="small">Small (44px)</option>
          <option value="medium">Medium (54px)</option>
          <option value="large">Large (64px)</option>
          <option value="custom">Custom</option>
        </select>
        {fabSize === 'custom' && (
          <div className="fab-custom-size-row">
            <input
              type="number"
              min={32}
              max={100}
              value={fabCustomSize}
              onChange={(e) => setFabCustomSize(Number(e.target.value))}
            />
            <span className="fab-custom-size-label">px</span>
          </div>
        )}
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
