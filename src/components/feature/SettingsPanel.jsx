// Settings tab content — all user preference controls, grouped into
// collapsible categories so the panel stops being one long scroll.
import { useState, useEffect } from 'react';
import { useSettings }       from '../../hooks/use-settings.js';
import { useRollbackConfig } from '../../hooks/use-rollback.js';
import { useMobile }         from '../../hooks/use-mobile.js';
import { useUi }             from '../../hooks/use-ui.js';
import { ThemeSettings }         from './ThemeSettings.jsx';
import { AccessibilitySettings } from './AccessibilitySettings.jsx';
import { HOTBAR_ACTIONS }    from '../../constants/hotbar-actions.js';
import {
  COLLAPSE_STAGE_ORDER,
  COLLAPSE_STAGE_LABELS,
  COLLAPSE_STAGE_HINTS,
  COLLAPSE_STATES,
  normalizeCollapseStages,
} from '../../constants/folders.js';
import {
  MIN_WINDOW_WIDTH,
  MIN_WINDOW_HEIGHT,
  ROLLBACK_SNAPSHOT_WARN,
  ROLLBACK_MAX_CUSTOM,
  STORAGE_QUOTA_PROFILE_WEBKIT,
  STORAGE_QUOTA_PROFILE_OTHER,
} from '../../constants/limits.js';

function SettingsSection({ id, title, openSet, toggleSection, children }) {
  const isOpen = openSet.has(id);
  return (
    <div className={`settings-section${isOpen ? ' settings-section--open' : ''}`}>
      <button
        type="button"
        className="settings-section-header"
        onClick={() => toggleSection(id)}
        aria-expanded={isOpen}
      >
        <span className="settings-section-chevron">{isOpen ? '▼' : '▶'}</span>
        <span className="settings-section-title">{title}</span>
      </button>
      {isOpen && <div className="settings-section-body">{children}</div>}
    </div>
  );
}

export function SettingsPanel() {
  const {
    counterTiers,
    defaultWindowWidth,
    defaultWindowHeight,
    tieredCounterEnabled,
    hideSuggestionsByDefault,
    hideEntryStats,
    markPrivateEntries,
    hotbarSlots,
    entryHeaderSize,
    fabSize,
    fabCustomSize,
    fabQuickMenuEnabled,
    resetWindow,
    setCounterTiers,
    setDefaultWindowWidth,
    setDefaultWindowHeight,
    setTieredCounterEnabled,
    setHideSuggestionsByDefault,
    setHideEntryStats,
    setMarkPrivateEntries,
    setHotbarSlots,
    setEntryHeaderSize,
    setFabSize,
    setFabCustomSize,
    setFabQuickMenuEnabled,
    rollbackDefaultEnabled,
    setRollbackDefaultEnabled,
    keepMenuOpenAfterImport,
    setKeepMenuOpenAfterImport,
    crosstalkEnabled,
    setCrosstalkEnabled,
    folderCollapseStages,
    setFolderCollapseStages,
    condensedShowStats,
    setCondensedShowStats,
    crosstalkSwapMode,
    setCrosstalkSwapMode,
    thesaurusEnabled,
    setThesaurusEnabled,
    funnyFishEnabled,
    setFunnyFishEnabled,
    storageQuotaProfile,
    setStorageQuotaProfile,
  } = useSettings();

  const {
    rollbackEnabled,
    snapshotCount,
    autoSnapshot,
    setRollbackEnabled,
    setSnapshotCount,
    setAutoSnapshot,
  } = useRollbackConfig();

  const isMobile = useMobile();

  // Editing is open by default — most users land in Settings to tweak it.
  // Other sections collapsed so the panel reads as a short menu.
  const [openSet, setOpenSet] = useState(() => new Set(['editing']));

  // Deep-link: another surface (e.g. the keyboard-help overlay's "Edit
  // shortcuts") can request a specific accordion section be opened. Consume and
  // clear the request when the panel mounts / the request changes.
  const pendingSettingsSection    = useUi((s) => s.pendingSettingsSection);
  const setPendingSettingsSection = useUi((s) => s.setPendingSettingsSection);
  useEffect(() => {
    if (!pendingSettingsSection) return;
    setOpenSet((prev) => new Set(prev).add(pendingSettingsSection));
    setPendingSettingsSection(null);
  }, [pendingSettingsSection, setPendingSettingsSection]);

  function toggleSection(id) {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else              next.add(id);
      return next;
    });
  }

  function updateSlot(index, value) {
    const next = [...hotbarSlots];
    next[index] = value || null;
    setHotbarSlots(next);
  }

  return (
    <div className="settings-panel">

      {/* ════════════════════════════════════════════════════════════
          Editing & Entries
          ════════════════════════════════════════════════════════════ */}
      <SettingsSection id="editing" title="Editing & Entries" openSet={openSet} toggleSection={toggleSection}>

        {/* Rollback (this lorebook) */}
        <div className="settings-group">
          <label className="settings-label">
            <span>Entry history (this lorebook)</span>
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
                When off, snapshots are only created manually via the entry's history panel. The save prompt on close still appears.
              </div>
            </>
          )}
        </div>

        <div className="settings-group">
          <label className="settings-label">
            <span>Enable entry history for new lorebooks by default</span>
            <input
              type="checkbox"
              checked={rollbackDefaultEnabled}
              onChange={(e) => setRollbackDefaultEnabled(e.target.checked)}
            />
          </label>
          <div className="settings-hint">
            New lorebooks will start with entry history turned on automatically.
          </div>
        </div>

        {/* Suggestions tray */}
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

        {/* Thesaurus */}
        <div className="settings-group">
          <label className="settings-label">
            <span>Look up synonyms via the dictionary API</span>
            <input
              type="checkbox"
              checked={thesaurusEnabled}
              onChange={(e) => setThesaurusEnabled(e.target.checked)}
            />
          </label>
          <div className="settings-hint">
            {isMobile
              ? 'Long-press a suggestion chip to open a synonym popover; cycle through definitions with ◀ ▶, tap synonyms to select, then Add. Fetches from api.dictionaryapi.dev on first hover per word; results are cached for the session.'
              : 'Hover a suggestion chip to open a synonym popover; cycle through definitions with ◀ ▶, click synonyms to select, then Add. Fetches from api.dictionaryapi.dev on first hover per word; results are cached for the session.'}
          </div>
        </div>

        {/* Stats badges */}
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

        {/* Private-entry marker */}
        <div className="settings-group">
          <label className="settings-label">
            <span>Mark private entries</span>
            <input
              type="checkbox"
              checked={markPrivateEntries}
              onChange={(e) => setMarkPrivateEntries(e.target.checked)}
            />
          </label>
          <div className="settings-hint">
            Shows a crossed-out eye on entries that are Private on CharSnap. Public entries always show an eye; since entries default to Private, this off-by-default marker is for when you want private entries flagged too.
          </div>
        </div>

        {/* Tiered counter colours */}
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

        {/* Entry card header height (desktop) */}
        <div className="settings-group">
          <label className="settings-label">
            <span>Entry header height</span>
            <select
              value={entryHeaderSize}
              onChange={(e) => setEntryHeaderSize(e.target.value)}
            >
              <option value="default">Default</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </label>
          <div className="settings-hint">
            Taller entry rows on desktop, so a long lorebook is easier to scan when many entries at once feels overwhelming.
          </div>
        </div>

      </SettingsSection>

      {/* ════════════════════════════════════════════════════════════
          Folders
          ════════════════════════════════════════════════════════════ */}
      <SettingsSection id="folders" title="Folders" openSet={openSet} toggleSection={toggleSection}>

        <div className="settings-group">
          <div className="settings-label">Collapse stages</div>
          {(() => {
            const active = normalizeCollapseStages(folderCollapseStages);
            const toggle = (state) => {
              const next = active.includes(state)
                ? active.filter((s2) => s2 !== state)
                : [...active, state];
              setFolderCollapseStages(normalizeCollapseStages(next));
            };
            return COLLAPSE_STAGE_ORDER.map((state) => {
              const checked = active.includes(state);
              // Full is the size every folder returns to, so it is never
              // optional. Beyond that, one more stage has to stay on or the
              // header button would have nothing to cycle to — so the last
              // remaining optional stage locks until the other is turned on.
              const locked = state === COLLAPSE_STATES.FULL || (checked && active.length <= 2);
              return (
                <label key={state} className="settings-checkbox-row">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={locked}
                    onChange={() => toggle(state)}
                  />
                  <span className="settings-checkbox-label">
                    {COLLAPSE_STAGE_LABELS[state]}
                    <span className="settings-checkbox-hint">{COLLAPSE_STAGE_HINTS[state]}</span>
                  </span>
                </label>
              );
            });
          })()}
          <div className="settings-hint">
            Which sizes the button on a folder&rsquo;s header cycles through. Turning a stage
            off is never destructive — a folder already set to it keeps that setting and
            simply renders at the nearest size you do have on, so turning it back on
            restores everything exactly as it was.
          </div>
        </div>

        <div className="settings-group">
          <label className="settings-label">
            <span>Show entry stats on condensed rows</span>
            <input
              type="checkbox"
              checked={condensedShowStats}
              onChange={(e) => setCondensedShowStats(e.target.checked)}
            />
          </label>
          <div className="settings-hint">
            Condensed rows normally shed the trigger and character counts to stay compact.
            Turn this on to keep them, rendered smaller to fit the row.
          </div>
        </div>

      </SettingsSection>

      {/* ════════════════════════════════════════════════════════════
          Reference / Crosstalk
          ════════════════════════════════════════════════════════════ */}
      <SettingsSection id="reference" title="Reference & Crosstalk" openSet={openSet} toggleSection={toggleSection}>

        <div className="settings-group">
          <label className="settings-label">
            <span>{isMobile ? 'Pair with reference lorebook' : 'Show reference panel'}</span>
            <input
              type="checkbox"
              checked={crosstalkEnabled}
              onChange={(e) => setCrosstalkEnabled(e.target.checked)}
            />
          </label>
          <div className="settings-hint">
            {isMobile
              ? 'Pairs a second lorebook as a reference. Shared triggers, same-named entries, and search hits in the paired book surface as inline annotations and overlays on the active book. Pick which book to pair from the Lorebooks tab.'
              : 'Adds a read-only panel beside the active lorebook so you can browse a second book and run cross-book find/replace. Click the reference side to swap which book is active. Turning this off clears the current reference selection.'}
          </div>
        </div>

        {!isMobile && (
          <div className="settings-group">
            <div className="settings-label">Crosstalk swap behavior</div>
            <select
              className="hotbar-slot-select"
              value={crosstalkSwapMode}
              onChange={(e) => setCrosstalkSwapMode(e.target.value)}
            >
              <option value="click-to-edit">Click reference to swap (default)</option>
              <option value="fixed-active-left">Fixed columns — Active on left</option>
              <option value="fixed-active-right">Fixed columns — Active on right</option>
            </select>
            <div className="settings-hint">
              {crosstalkSwapMode === 'click-to-edit'
                ? 'Clicking any edit-shaped element on the reference side swaps active and reference. The clicked panel stays in the same physical slot — only the role indicator moves.'
                : 'Active and reference panels are pinned to fixed columns. Use the Swap button next to the active picker to trade which book is active without moving the columns.'}
            </div>
          </div>
        )}

      </SettingsSection>

      {/* ════════════════════════════════════════════════════════════
          Window & Layout
          ════════════════════════════════════════════════════════════ */}
      <SettingsSection id="layout" title="Window & Layout" openSet={openSet} toggleSection={toggleSection}>

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

        <div className="settings-group">
          <label className="settings-label">
            <span>FAB quick-action menu</span>
            <input
              type="checkbox"
              checked={fabQuickMenuEnabled}
              onChange={(e) => setFabQuickMenuEnabled(e.target.checked)}
            />
          </label>
          <div className="settings-hint">
            Hover (desktop) or long-press (touch) the + button to open a popover with the hotbar actions. Tap the FAB itself to add an entry. Turn off to keep the FAB strictly Add-Entry.
          </div>
        </div>

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

        <div className="settings-group">
          <div className="settings-label">Browser storage limit</div>
          <select
            className="hotbar-slot-select"
            value={storageQuotaProfile ?? STORAGE_QUOTA_PROFILE_WEBKIT}
            onChange={(e) => setStorageQuotaProfile(e.target.value)}
          >
            <option value={STORAGE_QUOTA_PROFILE_WEBKIT}>
              Safari, or any browser on iPhone / iPad (5 MB)
            </option>
            <option value={STORAGE_QUOTA_PROFILE_OTHER}>
              Chrome, Firefox, Edge, Brave, etc. on Mac / Windows / Linux / Android (10 MB)
            </option>
          </select>
          <div className="settings-hint">
            Sizes the storage usage ring against the browser's actual `localStorage` cap. Auto-detected on first launch from your browser; change here if the detection was off.
          </div>
        </div>

        <div className="settings-group">
          <label className="settings-label">
            <span>Toggle Funny Fish</span>
            <input
              type="checkbox"
              checked={funnyFishEnabled}
              onChange={(e) => setFunnyFishEnabled(e.target.checked)}
            />
          </label>
          <div className="settings-hint">
            Swap the title-bar logo between the Sacabambaspis portrait and the original 📖 book emoji.
          </div>
        </div>

      </SettingsSection>

      {/* ════════════════════════════════════════════════════════════
          Appearance
          ════════════════════════════════════════════════════════════ */}
      <SettingsSection id="appearance" title="Appearance" openSet={openSet} toggleSection={toggleSection}>
        <ThemeSettings />
      </SettingsSection>

      {/* ════════════════════════════════════════════════════════════
          Accessibility (text scale, motion, contrast, keyboard shortcuts)
          ════════════════════════════════════════════════════════════ */}
      <SettingsSection id="accessibility" title="Accessibility" openSet={openSet} toggleSection={toggleSection}>
        <AccessibilitySettings />
      </SettingsSection>

    </div>
  );
}
