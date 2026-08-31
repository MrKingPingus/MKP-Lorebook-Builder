// Search keywords for the Settings filter box.
//
// Settings is dense enough that "which section is it in?" is a real question,
// and the 13B regrouping only softens it. Typing "fab" or "shortcut" should
// land you on the control regardless of which section won the argument.
//
// Keys are the group ids used in SettingsPanel.jsx. Each entry lists the words
// a user might reasonably type — including the ones NOT in the visible label,
// which is the whole point (someone hunting "hotkey" should find "Keyboard
// shortcuts"; someone hunting "dark mode" should find the theme picker).
//
// Lives here rather than inline so the group that renders and the section that
// decides whether to render at all read the same list (architecture rule 7).

export const SETTINGS_GROUP_KEYWORDS = {
  // ── Editing & Entries ──────────────────────────────────────────────
  suggestions:      'suggestions tray collapsed default hide triggers ideas',
  thesaurus:        'thesaurus synonyms dictionary api words related lookup',
  entryHistory:     'entry checkpoints history rollback snapshots undo restore versions backup',
  historyDefault:   'entry checkpoints history default new lorebooks rollback',

  // ── Appearance & Accessibility ─────────────────────────────────────
  // The counter and entry-badge groups moved here from Editing & Entries on
  // 2026-08-31. Their keywords keep every word someone would have typed while
  // looking for them in the old place — 'entries', 'editing' and 'writing'
  // included — because the point of this file is that the move is invisible to
  // anyone who searches instead of browsing.
  theme:            'theme colors colours dark light high contrast custom palette appearance',
  tieredCounters:   'tiered counter colors colours green yellow red threshold description triggers entries editing writing',
  warningScale:     'warning color colour scale three four gradient orange green yellow red counters bands steps fade entries editing writing limit',
  counterThresholds:'character count thresholds limit yellow orange red numbers chars entries editing writing length',
  statsBadges:      'entry stats badges hide trigger count character count header entries editing',
  condensedStats:   'condensed rows stats badges folders compact entries editing',
  fullCardsSelect:  'full entry cards select mode selecting condensed compact mobile rows density entries editing',
  privateMarker:    'private entries mark marker eye charsnap public visibility entries editing',
  accessibility:    'accessibility text size scale font larger reduce motion animation high contrast',
  funnyFish:        'funny fish logo sacabambaspis book emoji icon title bar',

  // ── Layout & Controls ──────────────────────────────────────────────
  keybindings:      'keyboard shortcuts hotkeys keys rebind chord bindings controls',
  hotbar:           'hotbar slots buttons toolbar actions footer bar',
  fabQuickMenu:     'fab quick action menu plus button add entry popover',
  legacyMenus:      'legacy menus hamburger gear settings header title dropdown navigation old classic',
  folderStages:     'folders collapse stages full condensed tucked hidden cycle',
  referencePanel:   'reference panel crosstalk pair second lorebook compare',
  crosstalkSwap:    'crosstalk swap behavior behaviour columns active reference fixed',
  keepMenuOpen:     'keep menu open import panel tab desktop',

  // ── System ─────────────────────────────────────────────────────────
  storageQuota:     'browser storage limit quota localstorage safari chrome firefox mb space',
};

/** Which groups belong to which section — lets a section know if it has any match. */
export const SETTINGS_SECTION_GROUPS = {
  editing:    ['suggestions', 'thesaurus', 'tieredCounters', 'counterThresholds',
               'statsBadges', 'condensedStats', 'fullCardsSelect', 'privateMarker', 'entryHistory', 'historyDefault'],
  appearance: ['theme', 'accessibility', 'funnyFish'],
  controls:   ['keybindings', 'hotbar', 'fabQuickMenu', 'legacyMenus', 'folderStages',
               'referencePanel', 'crosstalkSwap', 'keepMenuOpen'],
  system:     ['storageQuota'],
};

/** Normalize a query once so every match test uses the same form. */
export function normalizeQuery(query) {
  return (query ?? '').trim().toLowerCase();
}

/** Does a single group match? An empty query matches everything. */
export function groupMatches(groupId, query) {
  const q = normalizeQuery(query);
  if (!q) return true;
  const haystack = SETTINGS_GROUP_KEYWORDS[groupId] ?? '';
  // Every whitespace-separated term must appear somewhere, so "fab size" and
  // "size fab" behave the same and extra words narrow rather than widen.
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

/** Does any group in this section match? Drives whether the section renders. */
export function sectionMatches(sectionId, query) {
  const q = normalizeQuery(query);
  if (!q) return true;
  return (SETTINGS_SECTION_GROUPS[sectionId] ?? []).some((id) => groupMatches(id, q));
}
