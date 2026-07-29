// Settings tab content — all user preference controls, grouped into
// collapsible categories so the panel stops being one long scroll.
//
// Phase 13B regrouped six sections into four, by *what you are changing*
// rather than by which feature introduced the setting. Sub-dividers inside a
// section give the ordering a visible logic instead of an implied one, and
// within each section the most-reached-for controls lead.
import { useState, useEffect } from 'react';
import { useSettings }       from '../../hooks/use-settings.js';
import { useRollbackConfig } from '../../hooks/use-rollback.js';
import { useMobile }         from '../../hooks/use-mobile.js';
import { useUi }             from '../../hooks/use-ui.js';
import { ThemeSettings }         from './ThemeSettings.jsx';
import { AccessibilitySettings } from './AccessibilitySettings.jsx';
import { KeybindingSettings }    from './KeybindingSettings.jsx';
import { HOTBAR_ACTIONS }    from '../../constants/hotbar-actions.js';
import {
  COLLAPSE_STAGE_ORDER,
  COLLAPSE_STAGE_LABELS,
  COLLAPSE_STAGE_HINTS,
  COLLAPSE_STATES,
  normalizeCollapseStages,
} from '../../constants/folders.js';
import {
  groupMatches,
  sectionMatches,
  normalizeQuery,
} from '../../constants/settings-search.js';
import {
  ROLLBACK_SNAPSHOT_WARN,
  ROLLBACK_MAX_CUSTOM,
  STORAGE_QUOTA_PROFILE_WEBKIT,
  STORAGE_QUOTA_PROFILE_OTHER,
} from '../../constants/limits.js';

function SettingsSection({ id, title, openSet, toggleSection, query, children }) {
  const filtering = normalizeQuery(query) !== '';
  // A filtered-out section disappears entirely; a matching one force-opens,
  // because a filter that leaves its own hits collapsed surfaces nothing.
  if (filtering && !sectionMatches(id, query)) return null;
  const isOpen = filtering || openSet.has(id);

  return (
    <div className={`settings-section${isOpen ? ' settings-section--open' : ''}`}>
      <button
        type="button"
        className="settings-section-header"
        onClick={() => toggleSection(id)}
        aria-expanded={isOpen}
        disabled={filtering}
      >
        <span className="settings-section-chevron">{isOpen ? '▼' : '▶'}</span>
        <span className="settings-section-title">{title}</span>
      </button>
      {isOpen && <div className="settings-section-body">{children}</div>}
    </div>
  );
}

/** One control group. Hides itself when a filter is running and it doesn't match. */
function SettingsGroup({ id, query, children }) {
  if (!groupMatches(id, query)) return null;
  return <div className="settings-group">{children}</div>;
}

/** Section order, also used to decide whether a filter matched anything at all. */
const SECTION_IDS = ['editing', 'appearance', 'controls', 'system'];

/** Labelled rule between groups inside a section — structure, not a control. */
function SettingsDivider({ label, query }) {
  // While filtering, the runs a divider labels are no longer intact, so the
  // labels would be lying about what sits under them.
  if (normalizeQuery(query) !== '') return null;
  return (
    <div className="settings-divider" role="presentation">
      <span className="settings-divider-label">{label}</span>
    </div>
  );
}

export function SettingsPanel() {
  const {
    counterTiers,
    tieredCounterEnabled,
    hideSuggestionsByDefault,
    hideEntryStats,
    markPrivateEntries,
    hotbarSlots,
    fabQuickMenuEnabled,
    setCounterTiers,
    setTieredCounterEnabled,
    setHideSuggestionsByDefault,
    setHideEntryStats,
    setMarkPrivateEntries,
    setHotbarSlots,
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

  // Everything starts collapsed, so opening Settings shows the four section
  // titles and nothing else — the panel reads as a menu you choose from rather
  // than a wall of controls you have to scroll past.
  const [openSet, setOpenSet] = useState(() => new Set());

  // Filter box. Typing narrows to matching groups and force-opens the sections
  // holding them, so "which section is it in?" stops being a question you have
  // to answer before you can find anything.
  const [query, setQuery] = useState('');
  const filtering = normalizeQuery(query) !== '';
  const noMatches = filtering
    && !SECTION_IDS.some((id) => sectionMatches(id, query));

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

      <div className="settings-search">
        <input
          type="search"
          className="settings-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter settings…"
          aria-label="Filter settings"
          spellCheck={false}
        />
        {filtering && (
          <button
            type="button"
            className="settings-search-clear"
            onClick={() => setQuery('')}
            aria-label="Clear filter"
            title="Clear filter"
          >
            ×
          </button>
        )}
      </div>

      {noMatches && (
        <div className="settings-search-empty">
          No settings match &ldquo;{query.trim()}&rdquo;.
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          1 — Editing & Entries: what happens as you write
          ════════════════════════════════════════════════════════════ */}
      <SettingsSection id="editing" title="Editing & Entries" openSet={openSet} toggleSection={toggleSection} query={query}>

        <SettingsDivider label="Writing aids" query={query} />

        {/* Suggestions tray */}
        <SettingsGroup id="suggestions" query={query}>
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
        </SettingsGroup>

        {/* Thesaurus */}
        <SettingsGroup id="thesaurus" query={query}>
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
        </SettingsGroup>

        <SettingsDivider label="Counters" query={query} />

        {/* Tiered counter colours */}
        <SettingsGroup id="tieredCounters" query={query}>
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
        </SettingsGroup>

        <SettingsGroup id="counterThresholds" query={query}>
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
        </SettingsGroup>

        <SettingsDivider label="Entry badges" query={query} />

        {/* Stats badges */}
        <SettingsGroup id="statsBadges" query={query}>
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
        </SettingsGroup>

        {/* Condensed-row stats — an entry-badge setting that happens to apply
            inside folders, so it is filed by what it changes. */}
        <SettingsGroup id="condensedStats" query={query}>
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
        </SettingsGroup>

        {/* Private-entry marker */}
        <SettingsGroup id="privateMarker" query={query}>
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
        </SettingsGroup>

        <SettingsDivider label="Entry history" query={query} />

        {/* Rollback (this lorebook) — last in its section deliberately: the
            tallest block in Settings, and a per-book opt-in you set once. */}
        <SettingsGroup id="entryHistory" query={query}>
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
        </SettingsGroup>

        <SettingsGroup id="historyDefault" query={query}>
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
        </SettingsGroup>

      </SettingsSection>

      {/* ════════════════════════════════════════════════════════════
          2 — Appearance & Accessibility: how it looks
          "Accessibility" stays in the title on purpose — people who need
          those settings search for that word.
          ════════════════════════════════════════════════════════════ */}
      <SettingsSection id="appearance" title="Appearance & Accessibility" openSet={openSet} toggleSection={toggleSection} query={query}>

        <SettingsGroup id="theme" query={query}>
          <ThemeSettings />
        </SettingsGroup>

        <SettingsDivider label="Accessibility" query={query} />

        <SettingsGroup id="accessibility" query={query}>
          <AccessibilitySettings />
        </SettingsGroup>

        <SettingsDivider label="Fun" query={query} />

        <SettingsGroup id="funnyFish" query={query}>
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
        </SettingsGroup>

      </SettingsSection>

      {/* ════════════════════════════════════════════════════════════
          3 — Layout & Controls: how you drive the app, and how the
          workspace is arranged
          ════════════════════════════════════════════════════════════ */}
      <SettingsSection id="controls" title="Layout & Controls" openSet={openSet} toggleSection={toggleSection} query={query}>

        <SettingsDivider label="Controls" query={query} />

        {/* Keyboard shortcuts lead the section — the most substantial of the
            three input surfaces and the most looked-for. */}
        <SettingsGroup id="keybindings" query={query}>
          <div className="settings-label">Keyboard shortcuts</div>
          <KeybindingSettings />
        </SettingsGroup>

        <SettingsGroup id="hotbar" query={query}>
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
        </SettingsGroup>

        <SettingsGroup id="fabQuickMenu" query={query}>
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
        </SettingsGroup>

        <SettingsDivider label="Folders" query={query} />

        <SettingsGroup id="folderStages" query={query}>
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
        </SettingsGroup>

        <SettingsDivider label="Reference panel" query={query} />

        <SettingsGroup id="referencePanel" query={query}>
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
        </SettingsGroup>

        {!isMobile && (
          <SettingsGroup id="crosstalkSwap" query={query}>
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
          </SettingsGroup>
        )}

        <SettingsDivider label="Menus" query={query} />

        <SettingsGroup id="keepMenuOpen" query={query}>
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
        </SettingsGroup>

      </SettingsSection>

      {/* ════════════════════════════════════════════════════════════
          4 — System
          ════════════════════════════════════════════════════════════ */}
      <SettingsSection id="system" title="System" openSet={openSet} toggleSection={toggleSection} query={query}>

        <SettingsGroup id="storageQuota" query={query}>
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
        </SettingsGroup>

      </SettingsSection>

    </div>
  );
}
