# MKP Lorebook Builder — Implementation Plan

---

## Project Overview

MKP Lorebook Builder is a browser-only SPA for authoring AI lorebooks — structured collections of named entries with triggers, types, and descriptions that activate contextual information in LLM sessions. No backend, no accounts, no installation. All state lives in localStorage.

---

## Phase 10 — CharSnap Parity, Export Control, Themes & Accessibility

**Context:** First batch after a development pause (planned 2026-07-19). Four independently-shippable sub-phases, worked in order **A → B → C → D**. 10A is a live-bug fix and the natural re-entry point; each later sub-phase ships as its own batch so it can be tested in isolation (same philosophy as Polish Pass 5). The builder targets **CharSnap (CS)** specifically, so JSON parity with the CharSnap format is a first-class goal.

### 10A — CharSnap JSON Parity (fixes #102)

**Goal:** JSON round-trips losslessly against the CharSnap format. Clears the reported "all entries import as Character" bug (#102).

Root cause of #102: `json-import.js` (`normalizeEntry`) reads only `src.type`; CharSnap's format and the current template use **`entryType`**, so every entry fell through to `DEFAULT_TYPE` ('character'). The *values* already normalize correctly — only the field name was missed.

- [x] **Import reads `entryType`** — added `entryType` (+ PascalCase variants) to the type alias chain in `normalizeEntry` (`json-import.js`), with `type` kept as a fallback so older app-exported books still import. Clears #102. _(commit 5c0109c)_
- [x] **Export emits the CharSnap shape** — `json-export.js` writes `entryType` labels (not the internal `type` id) and serialises `entries` as a **keyed object** (`{"1": {...}}`); only CharSnap fields are emitted. Verified byte-shape-identical to the sample template.
- [x] **`isPublic` round-trips** — `isPublic` added to `DEFAULT_ENTRY`, read on import, written on export. **Default changed to `false` (private) 2026-07-20** to mirror CharSnap's private-by-default model; import treats an absent flag as private, export emits `isPublic === true`. Entries with an explicit value are untouched.
- [x] **Field set is fully modeled** — CharSnap confirmed the sample's fields (`name`, `triggers`, `description`, `entryType`, `isPublic`) are the complete set, so every field is modeled explicitly; no unknown-field passthrough needed.
- [x] **Per-entry "Public" toggle** — Public/Private button beside Hide-from-Export in the desktop `EntryCard` and mobile `EntryDetailPanel` footers; discrete and individually undoable. _(commit 244a932)_
- [x] **"Make All Entries Public"** — shipped as the `make_all_public` hotbar action (one history snapshot; appears in the FAB quick-menu, pinnable). Can also be surfaced in the top bar / 10B Export Visibility mode later if a more prominent placement is wanted.
- [x] **Update the template** — the JSON template download and copy-to-clipboard now flow through the CharSnap-shaped exporter, so both emit the new shape. (TXT/DOCX templates are a separate human-readable format, unaffected by the CharSnap JSON fields.)
- [x] **"All Private" companion** — `make_all_private` hotbar action added 2026-07-19; mirrors All Public in the opposite direction, per user request.
- [ ] **Verify hand-made JSON import** — the #102 reporter noted hand-made JSONs "wouldn't import." Most likely malformed JSON rejected by `JSON.parse` (trailing commas / comments / smart quotes) rather than a schema issue, since the importer is otherwise lenient. Needs the reporter's actual file to reproduce; left open pending that.

**Stop condition:** The attached sample imports with every entry's type and `isPublic` intact; export produces CharSnap-shaped JSON that re-imports identically; per-entry Public toggle and Make-All-Public both work and snapshot to history.

### 10B — Bulk Export Visibility (Hide from Export)

**Goal:** Hide-from-Export is discoverable and works in bulk.

**Direction (2026-07-20):** Folded into the existing **Select** mode rather than a bespoke 4th search-bar mode. Select is already the generic "tick entries, do a bulk thing to them" surface, so visibility is just another bulk verb beside Change Type. This avoids a new `searchMode` enum value, a 4th dropdown option, generalizing the card select-predicate, and the store's mode-clear branch — all to re-implement machinery Select already has.

- [x] **`Set Visibility ▾` in the bulk bar** — a new expander in `BulkActionBar`, parallel to `Change Type… ▾`, opening a two-chip row (**Hidden / Shown**). Mutually exclusive with the Change-Type chips (only one row open at a time). Neutral styling since hiding is reversible, vs. Change Type's red apply-to-all.
- [x] **Bulk apply** — `setHiddenForSelected(bool)` in `use-bulk-actions.js`, a near-copy of `applyTypeChange`: one history snapshot, only entries that actually flip are touched (no-op = no snapshot), selection persists so actions chain.
- [x] **Three scopes reuse Select's affordances** — group (multi-select → apply), global (Select All Visible → apply), individual (the existing per-card Hide button; no per-row staging, since it's a boolean and the button already covers the single-entry path).
- [x] **Additive** — the in-card Hide-from-Export button and the header hidden-entries popover stay untouched.
- [x] **Bulk Public/Private companion** — the same Select-mode pattern drives a `Set Public/Private… ▾` expander (Public / Private chips) backed by `setPublicForSelected(bool)`, added 2026-07-20 per user request. Realises the "surface in Select mode" idea noted under 10A's Make-All-Public item; complements the global `make_all_public` / `make_all_private` hotbar actions with a selection-scoped path. The bar's three expanders share one `openPicker` state (mutually exclusive). Verified through real JSON export (isPublic round-trips: 5 → 7 → undo 5 → Public 5).

**Stop condition:** ✅ (verified 2026-07-20, browser-driven against the Reika fixture) In Select mode, the user can multi-select (or Select-All-Visible) entries and bulk Hide/Show them via `Set Visibility ▾` in one undoable step; undo restores; the per-card Hide button still works.

### 10C-pre — Hotkey Engine Overhaul (shipped)

**Context:** Pulled out of 10D and done first as its own standalone pass (decision 2026-07-21). The old system was a fixed if-cascade in `useKeyboardShortcuts` with only three single-letter, fixed-modifier hotkeys. Replaced with a registry-driven engine so shortcuts are data, not conditionals.

- [x] **Keybinding registry** — `constants/keybindings.js`: pure action descriptors (`id`, `label`, `category`, `defaultChord`, `wired`, `context`, `fixed`). `services/keychord.js` owns the canonical chord grammar (cross-platform `Mod` = ⌘/Ctrl), event matching, capture, platform-aware display, reserved-chord checks, and the legacy-hotkey migration.
- [x] **Dispatch table** — `useKeyboardShortcuts` is now a thin dispatcher over the resolved binding list + a handler map from `App.jsx`; adding an action is a registry line, not a new conditional. `use-keybindings.js` merges registry defaults with `settings-store.keybindings` overrides (deltas only) and is the single source of truth for chord display.
- [x] **Full capture-based rebinding** — Settings → Hotkeys is a per-action table with a "press the keys" capture control, reserved-chord refusal, duplicate-clash warnings, per-row + reset-all. Legacy `newEntry/undo/redo` single-letter fields migrate into the override map on boot.
- [x] **Escape priority stack** — `services/dismiss-stack.js` + `use-dismiss-layer.js`; Escape pops the single highest-priority active layer (popover → modal → find-replace → compare → pick-from-reference → select). The four menu popovers consume Escape before the global dispatcher; the old single-layer cascade is gone.
- [x] **Cheat-sheet overlay** — `?` opens a registry-generated shortcut list (`KeyboardHelpOverlay`); it updates live with custom bindings and has an "Edit shortcuts" deep-link into Settings → Hotkeys. All six previously-hardcoded chord displays (hotbar tooltips, lander, empty-state, rollback hint) now read from the registry.
- [x] **Curated shipping set** — new entry, undo, redo, toggle select, focus search, toggle reference, export, open settings, keyboard help. The rest of the roadmap list (save snapshot, expand/collapse all, compare, find-replace focus, next/prev cross-match, swap reference, import) are collision-checked reserved defaults, unwired until their batch.

**Stop condition:** ✅ (verified 2026-07-21, browser-driven) Users rebind any action via capture; custom chords fire and display everywhere live; `?` shows the sheet; Escape pops layers in priority order. See `verify/checks.mjs` (default-fire, Escape-stack ordering, rebind + live display).

### 10C — Color themes

**Goal:** Switch among stock themes and build a custom one.

Foundation is solid: the whole palette is ~15 CSS custom properties in one `:root` block (`style.css:21–51`). Stock themes = alternate token sets; custom = user values persisted to `settings-store`, injected as inline vars. Decision (2026-07-19): **do all three tiers in one pass.**

- [ ] **Theme mechanism** — a `data-theme` attribute/class on the app root selects a stock palette; `settings-store` gains a `theme` field, applied on boot.
- [ ] **Stock dark themes** — a handful of curated dark palettes (low risk).
- [ ] **Light / high-contrast theme** — needs an audit for hardcoded dark-assumption colors (shadows, inline hex bypassing tokens). High-contrast doubles as the accessibility theme (feeds 10D).
- [ ] **Custom theme editor** — settings UI to set core tokens, validate contrast, persist as inline `:root` overrides.
- [ ] **Entry-type dot colors stay in `entry-types.js`** and are untouched, *except* an opt-in override available only in custom mode (default: dots unchanged).

**Stop condition:** User can pick a stock dark theme, switch to light/high-contrast, and define + persist a custom theme (optionally overriding entry-type dot colors).

### 10D — Accessibility section

**Goal:** A dedicated Accessibility section in Settings covering scale, motion, contrast, and hotkeys.

- [ ] **New Settings → Accessibility accordion section.**
- [ ] **Font / UI scale** — the CSS is ~274 px-based font-sizes vs. 1 rem, so scaling can't be a root-size toggle. Robust path: mechanical px→rem conversion + a root scale multiplier (3–4 steps, e.g. 90 / 100 / 110 / 125 %). Avoid `zoom` / `transform: scale` wrappers — they break this app's fixed-position portals, draggable/resizable window, and `getClientRects` diff overlays. Budget as a real pass, not a toggle.
- [ ] **Reduced motion** — a toggle (and honouring `prefers-reduced-motion`) that disables smooth-scroll and CSS transitions.
- [ ] **High-contrast** — surfaced here, backed by the 10C high-contrast theme.
- [ ] **Move Hotkeys under Accessibility** — the hotkey engine itself (dispatch table, wider configurable set, Escape stack) shipped in **10C-pre**; the remaining 10D task is just relocating the rebuilt Hotkeys accordion into this section.

**Stop condition:** Settings has an Accessibility section; font/UI scale visibly resizes the app; reduced-motion and high-contrast toggles work; hotkeys are configured from within this section.

**Estimated Complexity:** 10A Low · 10B Low–Medium · 10C Medium · 10D Medium–High

---

## Workflow Overhaul (initiative)

An ongoing pass to find and sand down points of friction, rather than a single feature. Goal: make the common authoring loops — especially import/export and hotbar customization — fast and obvious. Kicked off 2026-07-19. New friction points get logged below as they surface; concrete fixes graduate into a phase when picked up.

### Candidate features

**✅ Export action on the hotbar (with a floating format menu) — shipped 2026-07-19**
Implemented as the `make_export` hotbar action: a floating `ExportMenu.jsx` anchored above whichever button triggered it (a hotbar slot or the FAB-menu item), with a filename field (pre-filled from the book name) and JSON / TXT / DOCX / Copy-JSON. The click event is threaded through `execute()` so the resolver can anchor to the button rect; open/close lives in `exportMenuAnchor` on `ui-store`. ZIP was omitted (not a single-book export path). Original design note:
A hotbar-registrable **Export** action that opens a small floating menu anchored above wherever the button sits on the hotbar (same pattern as `FabQuickMenu`). The menu asks two things and exports in one step:
- **Format** — JSON / TXT / DOCX / ZIP (the existing export formats)
- **Title** — the export filename (defaults to the lorebook name; filename-override plumbing already exists in `use-export.js` / the Export panel)

Today export lives only inside the Import/Export menu panel; this surfaces it as a one-click hotbar action so exporting doesn't require opening the menu. Reuses `useExport()` and the existing format/filename logic. New: a hotbar descriptor + resolver (`hotbar-actions.js`, `use-hotbar-actions.js`) and a small anchored menu component modeled on `FabQuickMenu`.

**✅ Add-to-hotbar quick action (from the FAB menu) — shipped 2026-07-19**
The FAB quick-menu is a compact **horizontal** row of action chips with a centered **"Add to hotbar"** button above the FAB (redesigned 2026-07-19 from an earlier tall vertical menu + L1–R3 sub-grid). Pressing Add to hotbar starts the pin flow: the **real hotbar slots** become armable drop targets — click a slot to arm it (filled or empty), then click an action chip to drop it in. Writes via `setHotbarSlots`; the menu stays open ("sticky") while pinning. The menu sizes to content and caps to the measured hotbar width (ResizeObserver), wrapping to 2–3 rows on narrow windows instead of overflowing. **Also changed the default hotbar layout** to Import · (empty) · Undo | Redo · (empty) · Export — Clear All dropped from the default as too niche. Existing saved layouts are untouched.

### Friction Log

Running list of rough edges to evaluate for the overhaul. Add items as they surface; listing implies no commitment.

- Export is buried in the Import/Export menu panel — no quick surface. _(→ Export hotbar action above)_
- Customizing the hotbar requires a trip through Settings. _(→ add-to-hotbar quick action above)_
- _(add more as they surface)_

---

## Phase 9 — Global Features

**Goal:** The app can show two lorebooks side by side for congruency-checking, lateral search, and lateral find & replace. Users have a dedicated planner for drafting future entries.

> **Update (2026-07-19):** Phase 9's two remaining open items — the **Entry Planner** and the **Mobile crosstalk redesign** — are parked and moved to Future Features (see below). The planner is intentionally deprioritized. Everything else in Phase 9 shipped.

### Design: Active + Reference

A dual-editor prototype (two `BuildPanel` instances behind a side-aware context) was attempted and retracted after it surfaced pervasive issues with two active editors sharing stores — autosave clobber, dangling slot references after delete, lorebook creation taking over the focused slot, and a widening refactor surface across every edit hook. Crosstalk uses an **active + reference** model instead:

- The **active side** is the existing single-lorebook editor. Unchanged.
- The **reference side** renders a second lorebook **read-only**.
- Clicking any edit-shaped element on the reference side (entry card body, Expand, Remove, FAB, name input, trigger editor, description textarea) **swaps** active ↔ reference in one Zustand state flip — no remount, no reload. Reads as "I edited that side."
- Picker, scroll position, and expanded-entry state stay per-side (do not swap).
- Search, filter, and sort are **global** — one UI above the pane split drives both sides. This natively satisfies the lateral-search requirement.
- Same lorebook on both sides is structurally forbidden (reference picker hides the active id; picking the active id from the reference picker triggers a swap).

Store impact is one new field on `lorebook-store` (`referenceLorebookId`). Every other store and hook retains its single-active-lorebook semantics.

### Prerequisites

- [x] **`diff-service.js`** — pure structural delta between two entry objects. Hand-rolled word-level LCS for descriptions (capped at 4000 combined tokens with graceful degrade), ordered set arithmetic for triggers, equality on other fields. Also exports `entriesShallowEqual` for cheap render-path checks. Tokenization splits punctuation runs from word runs (preserves apostrophes for contractions) so trailing punctuation drift no longer breaks shared words. Powers both rollback diff highlighting and the cross-pane compare mode.

### Features

**Lorebook Crosstalk (Active + Reference):**
- [x] `referenceLorebookId` field + `setReferenceLorebookId` / `swapReference` actions in `lorebook-store`; invariant that reference ≠ active
- [x] `use-reference-lorebook.js` hook exposing the reference and the swap action
- [x] `ReferencePanel` component — read-only render of the reference lorebook with its own picker (excludes active id)
- [x] Swap-on-edit-click — single `onMouseDown` handler on edit-shaped reference surfaces that calls `swapReference()` before any edit UI can mount
- [x] Global search/filter/sort bar promoted above the pane split in crosstalk mode; both panes consume the same filter state from `ui-store`
- [x] Lateral find & replace — preview scans both active and reference entries; per-side Apply buttons (Apply to Active / Apply to Reference / Apply to Both) satisfy the per-lorebook confirmation requirement
- [x] **Cross-pane diff indicators** — desktop entry cards show an "in both ↗" / "differs ⚖" / "comparing ✎" badge driven by `useNameMatch()` + `entriesShallowEqual`. Symmetric on active and reference cards; green badge on a matched pair scroll-jumps to the counterpart with a brief flash; yellow badge enters compare mode.
- [x] **Side-by-side compare mode** — clicking a yellow "differs" badge expands both cards, scrolls them into view, force-expands the matched reference card's description, and renders the reference card with a full mirror of the active editor's layout (read-only inputs/select/chips). Active editor grows live diff annotations: yellow "● differs" dot per changed field, yellow left-border on the field, a single "← Copy…" menu (per-field) and "⇇ Copy All from Reference" button on the DESCRIPTION label row. Description gets a JS-computed outline overlay using `getClientRects()` per visual line — green boxes around 'add' segments on the active side, red boxes around 'del' segments on the reference side. Outlines re-measure on text change, font load, and width change. Active card's suggestions tray, rollback footer, and description footer are hidden while compare mode is engaged so both sides share a focused minimal layout. Copy actions auto-exit compare mode when the result matches; the badge flips to green "in both" without a second click.
- [x] **Cross-match sort modes** — `'cross-match-first'` and `'cross-match-last'` partition entries by name overlap with the paired reference book; available in the sort dropdown only when crosstalk is active. Group-by-type is auto-suppressed in these modes so the partition isn't re-bucketed.
- [x] **Crosstalk swap mode setting** — `crosstalkSwapMode`: `'click-to-edit'` (default; clicking the reference pane swaps roles AND visually swaps panes), `'fixed-active-left'`, `'fixed-active-right'` (panes pinned to columns; a `Swap` button next to the active picker trades books between roles).
- [x] Menu toggle to show/hide the reference panel (Settings → "Show reference panel"; replaces the development-only `?crosstalk=1` query gate)
- [ ] **Mobile crosstalk redesign** _(parked → Future Features)_ — replaces the broken side-by-side layout on mobile with an overlay/annotation model. Anchor never moves without explicit gesture; reference content surfaces as inline annotations on active entries and one-deep peek overlays. Multi-select pull uses a temporary "pose" against the existing Select mode. Full plan and phasing in `docs/mobile-crosstalk-plan.md`.

**Settings Panel Reorganisation:**
- [x] Settings panel grouped into four collapsible accordion sections — **Editing & Entries**, **Reference & Crosstalk**, **Window & Layout**, **Hotkeys** — to declutter the long flat list. Editing & Entries is open by default.

**Rollback Diff Highlighting:**
- [x] `RollbackPanel` snapshot preview now has a "Highlight Differences" toggle wired to `diff-service.js`. When on, the preview shows a "● modified" dot beside each changed field label, the description renders inline `add`/`del` segments (green / red strikethrough), and triggers show common chips in neutral, added in green, removed in red strikethrough. A header chip reports the count of changed fields.

**Entry Planner — parked (deprioritized → Future Features):**
- [ ] Planner panel — dedicated panel for notes and planned entry stubs; separate from the build panel
- [ ] Entry stub creation — converts a planner note into a blank entry shell in the active lorebook
- [ ] Stub filter on build page — filter toggle to show only entries created from stubs that have not been fully authored yet

### Stop Condition

User can set a reference lorebook on the right side, see both active and reference lists render, click any edit-shaped element on the reference to swap (editing then occurs on that side), search across both panes from one global bar, and run find & replace with a per-side Apply; user can create a planner note, convert it to an entry stub, and filter the build page to show only unfilled stubs; user can open a saved rollback snapshot and click "Highlight Differences" to see field-level changes highlighted.

**Estimated Complexity:** Medium (reduced from High after the active+reference pivot)

---

## Polish Pass 5 — UI Refinements (shipped)

A phased polishing sweep covering renames, select-mode upgrades, import-flow fixes, lander overhaul, FAB quick-add, and thesaurus on attached triggers. Each phase ships as its own batch so changes can be tested in isolation.

### Phase 1 — Quick fixes & polish (shipped)
- [x] **Rollback → Entry History** rename across user-facing strings; inactive button reads "Enable entry history?"
- [x] **Skip really skips** — the save-prompt Skip button now closes the entry without committing a snapshot (previously dismissed the prompt but left the entry open)
- [x] **Settings panel scroll** — Settings tab uses `flex: 1; min-height: 0` (was `height: 100%`) and `flex-shrink: 0` on each section so long sections no longer fall off the bottom
- [x] **Native spellcheck on description** — entry description textarea uses browser spellcheck; other inputs unchanged
- [x] **CHANGELOG bootstrap** — moved `docs/changelog.md` → `CHANGELOG.md` (repo root), backfilled missing entries since 2026-04-08, and added a standing reminder in CLAUDE.md to keep it current

### Phase 2 — Select Mode upgrades (shipped)
- [x] Swapped bulk-select toolbar layout — `Change Type… ▴` and `Apply Staged` cluster on the left adjacent to the type-chips row; `× Exit / Select All Visible / Deselect All` cluster on the right via the existing `margin-left: auto` on the count chip
- [x] Select mode + selection persist after `Change Type` runs. `Copy to Other Panel` keeps select mode active too (selection is cleared since the entries were copied, not transformed); `Pick from Reference` commit still ends the pose as before
- [x] Per-row staged type changes — `stagedTypes: Map<entryId, typeId>` in ui-store, selected entries show an inline `<select>` immediately next to the entry name (desktop — `.entry-card--selected .entry-label` drops `flex:1` so the dropdown sits flush against the label) or in the type slot (mobile). Yellow `--pending` border when the staged type differs from current. Amber `Apply Staged (N)` button in the bulk action bar commits all stages in one history snapshot. Stages clear on exit, deselect, side switch, or apply-to-all.
- [x] **Escape exits select mode** — `useKeyboardShortcuts({ onEscape })` in `App.jsx` calls `setSearchMode('search')` when in select mode, or `exitPickFromReference(false)` if the pick-from-reference sub-pose is active. Skipped while a text input is focused so inline editors keep their local Escape semantics. Future targets (find/replace, compare mode, popovers) and the broader hotkey audit are catalogued in Future Features → "Hotkey & ESC Roadmap".

### Phase 3 — Import flow & first-run fix (shipped)
- [x] Import Entries popup gains a segmented mode bar: **Paste entries**, **Entries from file**, **Whole book from file**. Paste and file-entries append; whole-book parses and offers Replace / Import as New. `use-append-import.js` exposes `confirmAppend / confirmReplace / confirmAsNew / clearParseState` and the popup picks the commit function based on the active mode. `ImportPreview.jsx` gained a `hideActions` prop so the whole-book mode can render its own Replace / Import-as-New action row without duplicating buttons.
- [x] Import tab save-warning prompt gained an **Append to active** button alongside the existing Replace (with optional JSON / TXT backup) and Import as New paths. State migrated from `asNewLorebook` boolean to a `disposition` enum (`'replace' | 'append' | 'as-new'`); the preview screen now shows a `.import-disposition-banner` so the user can see at a glance what `Confirm` will do.
- [x] First-run discard — `App.jsx` bootstrap marks the auto-created lorebook with `placeholder: true`. New helper `isPlaceholderLorebook(lb)` in `entry-factory.js` returns true only while the marker is present AND the book still looks pristine (default name, zero entries). New `importAsNewLorebook({ entries, name })` action in `use-lorebook.js` creates the new book, replaces entries, optionally renames, persists the new book + index synchronously, then `deleteLorebook(discardOldId)` if the prior active was a placeholder. Both the Import tab and the popup route Import-as-New through this helper.

### Phase 4 — Lander overhaul (shipped)
- [x] **Recent lorebooks panel** — top 6 entries from the lorebook index, last-edited relative-time stamps, click-to-open (switches active and dismisses the lander in one go). The active lorebook gets a blue outline so users can see what "Continue to builder" would land them on.
- [x] **Start tiles** — three large clickable tiles (New / Import file / Import paste) wired to `createLorebook`, `setActiveMenuPanel('import-export')`, and `setShowAppendImport(true)` respectively. The hero's Start Building button is replaced with a smaller "Continue to builder →" link in the lander footer for the no-action-needed case.
- [x] **Learn panel** — folds the existing How It Works steps, Tips list, and Import Templates row into a single Learn section. Hotkey list updated to include `Esc` (exits bulk select per Phase 2). Readme link preserved at the bottom.
- [x] **What's new panel** — bundles `CHANGELOG.md` via Vite's `?raw` import and renders it through a new hand-rolled markdown parser (`services/markdown-parse.js`) + a small inline renderer in `Lander.jsx`. No new dependencies. Capped at 320px height with a scroll for older entries.
- [x] **Report a Bug link** — lander footer links to a pre-filled GitHub issue template (title prefix "Bug:", `bug` label, body sections for what-happened / expected / repro / browser / console errors).

### Phase 5 — FAB quick-add (shipped)
- [x] **FAB quick-add menu** — new `FabQuickMenu` popover anchored above the FAB inside a `.footer-fab-wrap` container. Opens on desktop hover (200ms open delay, 200ms close delay, mouse bridge between FAB and menu) or touch long-press (`THESAURUS_LONG_PRESS_MS = 450`). Tap-outside dismissal on mobile via a document-level `pointerdown` listener; `onContextMenu` is suppressed on mobile and a `suppressNextClickRef` blocks the synthetic Add-Entry click that follows a long-press release.
- [x] **All-actions surface** — `useHotbarActions` now returns an `allActions` array (every registered hotbar action resolved against the same context) alongside the user's configured `slots`. The FAB menu consumes `allActions` so it acts as an action-discovery surface independent of hotbar layout.
- [x] **`fabQuickMenuEnabled` setting** — Settings → Window & Layout adds a toggle that gates the hover, long-press, and contextmenu-suppression code paths in `Hotbar.jsx`. Defaults true. Persists alongside the existing FAB size settings. The FAB tooltip was also trimmed back to `Add entry (Alt+N)` since the hover/long-press behaviour is self-evident.

### Phase 6 — Thesaurus on attached triggers (shipped)
- [x] **Activation** — `Chip.jsx` now opens the synonym popover on desktop hover (250ms open / 200ms close, longer than the suggestion-chip hover so casual mouse passes don't unfurl) or touch long-press (`THESAURUS_LONG_PRESS_MS = 450`, same threshold as suggestion chips). A `thesaurusSuppressNextClickRef` blocks the synthetic mobile tap-to-edit that would otherwise fire on long-press release. Hover on chips with `conflictEntries` falls through to the existing conflict popover; long-press still works on touch regardless of conflict state. The affordance is also gated on the existing `thesaurusEnabled` setting and skipped for `readOnly` reference-panel chips.
- [x] **Replace / Add Similar actions** — `ThesaurusPopover` accepts optional `sourceWord` + `onReplace` props. When set, the header renders a `.thesaurus-popover-actions` cluster with two buttons: **Replace** (enabled when exactly one synonym is selected; commits via `onReplace(selected[0])`) and **Add Similar** (existing multi-select Add behaviour, relabeled from "Add" when in replace mode). Existing-trigger disable logic continues to apply so neither path can introduce a dupe.
- [x] **TriggerChips wiring** — each editable `Chip` receives `onReplace={(v) => renameTrigger(i, v)}`, `onAddTriggers={addTriggerList}` (a new helper extracted from `addTrigger` that accepts a pre-split array of words), and `existingTriggers={triggers}`. Read-only chips in `ReferencePanel` are unaffected because the new props default to undefined.
- [x] **Disabled on conflict chips (logged as Known Bug)** — `thesaurusAvailable` in `Chip.jsx` now requires `!conflictEntries`. A `Conflict ⇄ Synonyms` switcher was prototyped (dashed `↻ Synonyms` button inside the conflict popover, `↩` back button inside the thesaurus header, single `activePopover` state, pointer-event stopPropagation, and a `cameFromConflict` gate on the hover-leave handlers) but two stacking/positioning issues kept it from landing cleanly: (1) the new popover rendering behind the old one during the swap, (2) the cursor landing on the bottom edge of the swapped-in popover and dismissing it on first mouse movement. Switcher state, JSX, CSS, and the `onSwitchBackToConflict` prop on `ThesaurusPopover` have been stripped for now. Reaching synonyms on a conflicting trigger requires Allow/Revoke first or inline-edit. Re-enable when a sturdier swap pattern is designed.

### Future Features (parked from this pass)
- **Lorebook self-reference** — intra-book entry-vs-entry consistency analysis. Adaptation of crosstalk against a single book. Scope (reuse crosstalk pipeline vs. new field-level diff) to be decided when picked up.

---

## Future Features

Features noted here are not assigned to a phase. They are documented to preserve intent and surface dependencies so implementation decisions can be made when the time is right.

---

**Entry Planner (parked from Phase 9)**
Dedicated panel for notes and planned entry stubs, separate from the build panel; convert a planner note into a blank entry shell; a build-page filter to show only unfilled stubs. Deprioritized 2026-07-19 — a fun feature, but it keeps sliding down the list behind core functionality. The smart-assistance extension (proper-noun scanning via `scan-service.js`) remains catalogued separately below. Revisit once the Phase 10 parity/themes/accessibility work is done.

---

**Mobile crosstalk redesign (parked from Phase 9)**
Replaces the broken side-by-side layout on mobile with an overlay/annotation model. Anchor never moves without explicit gesture; reference content surfaces as inline annotations on active entries and one-deep peek overlays. Multi-select pull uses a temporary "pose" against the existing Select mode. Full plan and phasing in `docs/mobile-crosstalk-plan.md`. Parked 2026-07-19 pending renewed focus on crosstalk.

---

**Icon / Symbol Library (replace emoji + text glyphs)**
Adopt a proper icon set (e.g. an inline SVG sprite or a lightweight icon package that respects the "no external CDN, browser-only" constraints) for UI affordances currently drawn with emoji or bare text characters — the FAB `+`, hotbar action icons, the 📌/⬇/⎘/↕ glyphs, etc. Motivations: consistent rendering across platforms (emoji look different per-OS and don't inherit `currentColor`), crisper scaling, and cleaner theming once color themes land (Phase 10C). Scope to decide when picked up: which library/approach fits the layer rules and bundle budget, how icons are referenced from constants, and a migration order. Noted 2026-07-20 while fixing the mobile FAB long-press selection bug — not urgent, revisit after the Phase 10 parity/themes/accessibility work.

---

**Lorebook JSON Metadata Portability (`_meta`)**
Add `createdAt` and `lastModified` timestamps to lorebook objects. Export: optional checkbox "Include metadata" appends a `_meta` block (timestamps + settings snapshot) to the JSON. Import: detect `_meta` block and prompt user to apply or skip the saved settings. Requires updates to `json-export.js`, `json-import.js`, lorebook creation, and `autosave.js`. Deferred from Polish Pass 2 — good idea but not yet worth the resource investment.

---

**In-App Help Menu / Documentation Panel**
A dedicated help section accessible from the UI (button or settings tab) containing usage guidance, tips, and feature explanations. Content scope and navigation structure not yet defined. Depends on: nothing technically blocking it, but content needs to be written before implementation makes sense. Deferred until user feedback clarifies what information users actually need surfaced in-app.

---

**Shift+Scroll on All Dropdowns**
`TypeSelector` already supports Shift+scroll to cycle through entry types without opening the dropdown. Extend this pattern to every other `<select>` in the app: the sort mode selector, the trigger delimiter selector (both in `EntryCard` and `EntryDetailPanel`), and any future dropdowns. The implementation is a self-contained `onWheel` handler on the `<select>` element — the existing `TypeSelector` code is the reference.

---

**Hotkey & ESC Roadmap**
The engine overhaul shipped in **10C-pre** (2026-07-21). Status of the original open items:

1. ✅ **Escape priority stack** — `services/dismiss-stack.js` pops the highest-priority active layer (popover → modal → find-replace → compare → pick-from-reference → select); the four menu popovers consume Escape before the global dispatcher. The old single-layer cascade is gone. Not yet in the stack: the lander and the snapshot navigate-away prompt (intentionally left — low value / surprise risk).
2. ◑ **Key-config audit** — the App-level bindings and the four menu popovers (`TypeFilterBar`, `ExportMenu`, `ThesaurusPopover`, `LorebookRoleBar`) were catalogued and normalised into the registry / dismiss stack. The remaining inline-editor handlers (`Chip.jsx`, `LorebookNameModal.jsx`, `LorebookPanel.jsx`, `LorebookSwitcher.jsx`, `RollbackPanel.jsx` label edit) stay local by design — focus-guarded, no collision — and were left untouched (decision 5b).
3. ✅ **Wider configurable set + dispatch table** — done. Actions are registry entries; nine are wired, the rest (save snapshot, expand/collapse all, compare, find-replace focus, next/prev cross-match, swap reference, import) are collision-checked reserved defaults awaiting their batch.

**Deferred gap — keyboard entry navigation.** There is no "focused entry" concept (no roving-tabindex cursor over entry cards), so per-entry keyboard ops (duplicate / delete / toggle *this* entry) aren't yet possible. This is a real accessibility item for **10D-proper** or later — building it is a feature in its own right, out of scope for the engine pass.

**Lookup Table Trigger System**
A categorised, genre-separated reference table for trigger suggestions — separate from the live suggestion engine. Users would browse or filter a curated list of triggers by type or genre and add them directly. Depends on: nothing currently built blocks it, but it is a substantial standalone feature. Would benefit from the suggestion engine architecture being stable first.

**Entry Planner Smart Assistance**
Extends the basic Entry Planner (Phase 9) with proper noun scanning via `scan-service.js` — detects names mentioned in planner notes that don't have existing entries and prompts the user to create them. Depends on: Entry Planner (Phase 9) and `scan-service.js` (Phase 7) both being complete.

**Lorebook Crosstalk — Second Window Mode**
The Phase 9 Lorebook Crosstalk uses a panel-within-window approach. For power users comparing large lorebooks, a second floating window may be more practical. Depends on: Phase 9 Lorebook Crosstalk being fully stable. Significant UI complexity — z-index management between two draggable windows.

**Category-Weighted Suggestion Variants**
`suggestion-engine.js` applies different suggestion weights and candidate pools based on entry type, so suggestions for a character entry differ meaningfully from those for a location entry. Requires a per-type lookup table or seed word list to have real impact. Deferred from Phase 7 until a lookup table approach is designed. Depends on: suggestion engine architecture being stable.

**Thesaurus Trigger Suggestions — Follow-ups**
The base feature shipped — see the completed section for what was built. Two open follow-ups under consideration if data quality from `dictionaryapi.dev` proves limiting in real use:

1. **Datamuse `ml=` backup sense** — when the dictionary returns thin or empty synonym lists, append a final "Related" sense to the cycle pulled from Datamuse's means-like endpoint. Broadens the pool without bundling anything; cost is one extra HTTP request per word. Free, no API key, CORS-friendly. Worth doing if empty/sparse cases stay annoying after real authoring use; sense quality tradeoff is that `ml=` mixes loose semantic neighbours (sometimes including antonyms or surprising associations) where the dictionary returns curated thesaurus pairs.
2. **Bundle a frequency-filtered local thesaurus** — solves API outages, removes the outbound network dependency entirely, and gives precise control over data quality (filter archaic forms, name-spam, etc.) at the cost of a meaningful bundle hit (~1MB+ even gzipped/lazy-loaded). Only justified if API coverage stays poor after the Datamuse backup is wired; bundling without lemmatization wouldn't help, and we already have a rule-based lemmatizer. Probably overkill for the current data-quality complaints.
3. **Surface the resolved lemma in the header** — when the user hovers "lives" but synonyms come from the lemma "life", the header could show "Synonyms for 'lives' (via 'life')" so the user understands why the synonyms reflect the noun sense rather than the verb. Small clarity polish; service already returns the resolved word internally.

Notes on what won't be revisited unless something changes:
- Per-PoS granularity rather than per-sense — `dictionaryapi.dev` only populates the meaning-level synonym array, so cycling through "as in pleasing" / "as in moral" / "as in high-quality" senses of "good" within the adjective bucket isn't possible without a different data source. A paid sense-aware API (Merriam-Webster, Oxford) or an LLM call would be required.
- Archaic synonyms like "forthy" / "sith" appearing for "because" — these are legitimate WordNet/Wiktionary entries with no `archaic: true` flag the API exposes. Filtering would need a frequency dictionary, which is bundle-heavy.

---

**Entry Splitting**
An optional system for breaking a long entry into two entries when it exceeds a length threshold. Includes:
- Split detection — identifies when an entry exceeds a threshold and suggests potential split points
- Entry split action — splits one entry into two; the second inherits all triggers from the first and a system-generated name suffix
- Linear/non-linear prompt — asks whether the split content is chronologically sequential; linear splits inject a bridging prefix phrase into the second entry's description
- Split chip — small badge on split entries indicating they are part of a pair
- Character limit override — allows entries in split mode to temporarily exceed `CHAR_LIMIT` until the split is confirmed

Deferred because current long-entry authoring via per-entry limit overrides is sufficient for now. Revisit if a structured split workflow becomes desirable.

---

**Markdown Dropdown**
Helper UI on the description textarea for inserting common markdown formatting shortcuts (bold, italic, heading, bullet, blockquote, etc.); no parser, just insertion at cursor. Deferred because the target platform does not currently support markdown in lorebook entry descriptions. Revisit if platform support is added.

---

**Hover Peek on Collapsed Entries**
Hovering a collapsed entry card reveals a temporary preview of its contents (name/type/triggers/description summary) without actually expanding it. Lets users skim a long lorebook without committing to expand/collapse cycles. Deferred from Polish Pass 4 — useful but non-trivial to implement without interfering with drag-to-reorder and existing hover states.

---

**Mass Move / Bulk Reorder**
Multi-select entries and move them together up or down in the list. Options considered: checkbox column with bulk move buttons, shift-click range selection, or drag-group. No design decision yet. Deferred from Polish Pass 4 because single-entry drag is sufficient for current lorebook sizes; revisit when users report reorder friction on larger books.

---

**All-Conflicts Panel**
Aggregate view of every trigger overlap across the active lorebook in one place — current crosstalk UI only surfaces conflicts per-entry. Would list each conflicting trigger with the entries that share it and provide batch Allow/Revoke actions at the lorebook level. Deferred from Polish Pass 4; Phase 9 Lorebook Crosstalk may subsume parts of this need.

---

**Mobile Density Pass**
The mobile UI burns roughly half the viewport on chrome before any entries are visible — header bar, search/sort row, type filter chip row, lorebook name row, reference row (when crosstalk is on), and hotbar footer collectively eat ~490px on a typical phone. Crosstalk doesn't make this materially worse since Phase 3+ additions live inside entry cards, but the baseline density is already a problem.

Ideas to evaluate, ranked by approximate ROI:
- Collapse top chrome into a sticky compact bar on scroll — when the user scrolls down, the lorebook name, reference, and filter chips collapse into a thin row with the entry count and a chevron to re-expand. Search stays one tap away via an icon. Recovers ~250px during scroll.
- Replace the chip-row type filter with a `Filter ▾ (n)` button that opens a sheet/popover containing the chips. Recovers ~75–100px and matches the existing search-mode/sort dropdown pattern.
- Drop the visible `LOREBOOK NAME` / `REFERENCE` labels in favour of placeholder text and small icons inside the input/value cells. Recovers ~30–50px.
- Combine the lorebook-name and reference rows into one when crosstalk is on — name on the left, `ref: <name> ▾` pill on the right. Denser but reduces name input width.
- Auto-hide the lorebook name row when scrolling begins; tap the header title to reveal/hide.

User wants mockups before committing to any specific direction. Defer until after the mobile crosstalk redesign (`docs/mobile-crosstalk-plan.md`) is complete.

---

## Queued Adjustments

Items are moved into phases as they are assigned. Add new items here when discovered.

---

**Compare-mode side-by-side card dimensions still drift slightly**
The reference mirror in compare mode now matches the active card closely after suppressing the active card's suggestions tray, rollback footer, and description footer while comparing — but small dimensional differences remain (e.g. the active card has an "Allow all overlap" slot in the trigger header that the reference doesn't, and minor padding asymmetries between the editable inputs and their disabled mirror counterparts). The two columns read as paired but aren't pixel-identical row-for-row. Worth another pass to align the field rows precisely so corresponding sections sit at exactly matched y-coordinates across both panes.

---

## Known Bugs

Bugs are listed with a status of **Open**, **In Progress**, or **Fixed**. Fixed bugs note the phase or commit where they were resolved.

---

**Firefox: Cursor Resets to Position 0 on Click in Text Fields**
Reported by a Firefox user on their second session (first session worked fine). Clicking within any text field positions the cursor at the start of the field rather than at the click location; keyboard navigation still works. Suspected causes: (1) stored window position from a previous session causing an invisible overlap on the content area — ask user to drag the floating window to center and retry; (2) `shouldFocusName` ref in EntryCard not being cleared when a new entry is created while the card is already expanded, causing `focus()` to fire on subsequent collapse/expand cycles. Both issues have been patched; if the bug persists, the window position stored in localStorage is the next thing to investigate.
Status: **Open** — patches applied, awaiting confirmation from reporter

---

**Full Type Button Grid Setting Has No Effect**
The "Full type button grid in entry editor" toggle in the settings panel does not appear to change anything in the entry editor. Expected: toggling this setting switches the type selector between a compact and full grid layout.
Status: **Open** — deferred; setting now displays a "currently broken" hint in the UI

---

**Thesaurus Popover Unreachable on Conflict Chips**
Trigger chips that already have a conflict-ring popover (yellow or blue) do not open the Phase 6 synonyms popover on hover or long-press. A two-way switcher (`↻ Synonyms` inside the conflict popover, `↩` back arrow inside the thesaurus header) was prototyped in Polish Pass 5 Phase 6 and rolled back: with two separate booleans the new popover rendered *behind* the still-mounted old popover and got dismissed by the outside-click listener; with a single `activePopover` state and stopPropagation on the switcher buttons that race was fixed, but the swap then put the cursor on the bottom edge of the newly-opened popover (both popovers share the same `bottom` anchor), and the first mouse move tripped `mouseleave` → 200ms close timer. Disabling hover-dismiss when opened via the switcher didn't help in user testing. Reaching synonyms on a conflicting trigger currently requires Allow/Revoke first or inline-edit. To pick this up again: design a swap pattern where the new popover anchors so the cursor lands well inside its body (e.g., position the second popover at cursor coordinates rather than the chip), or render the synonyms inline inside the conflict popover instead of swapping.
Status: **Open** — switcher rolled back; thesaurus suppressed on conflict chips via `thesaurusAvailable && !conflictEntries` in `Chip.jsx`

---

## Phases 1–8 + Polish Passes — Completed

All planned features through Phase 8 are implemented. Summary of what was built:

- **Phase 1 — MVP:** localStorage persistence, autosave, floating window shell, entry cards with name/type/description/triggers, JSON export
- **Phase 2 — Functional Baseline:** draggable/resizable window with viewport clamping, undo/redo, drag-to-reorder, collapse/expand, live search, type filter, char/trigger counters, duplicate prevention, bulk paste
- **Phase 3 — Feature Complete:** find & replace with deduplication, search highlight, group-by-type, inline chip editing, compact trigger mode, suggestions engine with tray/reroll/add, full import/export suite (JSON/TXT/DOCX/ZIP), import preview, multi-lorebook navigation, settings panel, keyboard shortcuts, lander
- **Phase 4 — Polish & Hardening:** description highlight overlay, Enter-key scroll-to-first-match, Shift+scroll type cycling
- **Phase 5 — Phrase Builder:** phrase builder mode, pill row with drag reorder, confirm/cancel
- **Phase 6 — Search & Sort Enhancements:** sort modes (alpha-asc/desc, last-modified), `lastModified` timestamp on entries, window size/position persistence, search results dropdown with location tags, Enter-key navigation through matches
- **Polish Pass 1:** export section header, find & replace inline layout, mobile dropdown width and menu button fixes, counter color corrections (disabled = green), undo/redo hotkey customization, new entry auto-focus, search ↔ find-replace text transfer, dropdown re-open on focus, Shift+click tooltip on type filter "All" pill
- **Phase 7 — Trigger Enhancements:** expanded delimiter options (6 choices) wired to settings-store, `scan-service.js` generic lorebook scanner, trigger crosstalk detection with yellow/blue chip rings and hover popover (click entry name in popover to navigate to conflicting entry), Allow/Revoke acknowledgment system, `lorebook.allowedOverlaps` persistence
- **Polish Pass 2:** X button redirects to lander, lander section reorder (How It Works → Tips) with README link, double-click inline lorebook rename, new lorebook name modal, inline Yes/No delete confirmation, Find & Replace scope selector (chip toggles, Title/Triggers/Description/All), active field focus border changed to blue-grey (`--focus-border`), persistent yellow/red tiered borders on description and trigger fields
- **Phase 8 — Entry Enhancements:** entry health evaluator, per-entry limit overrides with blue override border, opt-in rollback system with snapshots, navigate-away save prompt, in-card snapshot preview, restore action
- **Polish Pass 3:** reroll suggestions fix, capitalized trigger suggestions preserve casing, backslash-artifact import fix, copy-to-clipboard template buttons on lander
- **Polish Pass 4:** cross-sentence proper-noun pair fix, suggestions-toggle hitbox tightened, phrase-builder background recolour, hidden-entries popover propagation fix, green hover on suggestion chips, reroll button repositioned, Allow All Overlap batch action, Hide from Export with closed-eye marker and popover, export filename override
- **Thesaurus Trigger Suggestions:** Settings-toggled (default on) chip-anchored synonym popover on the suggestions tray. Desktop hover or mobile long-press (~450ms) opens a portal popover sourced from `dictionaryapi.dev`. Synonyms group by part of speech with `◀ ▶` cycle arrows; multi-select chips with a single **Add** commit. Per-word in-memory cache, rule-based `lemmatize.js` fallback for inflected words (features → feature, lives → life, majoring → major, etc.). Popover has a `min-height: 100px` floor and switches to outside-click-only dismissal once the user clicks a sense arrow or chip, so cycling senses with very different synonym counts doesn't shrink the popover under the cursor. New: `services/thesaurus-service.js`, `services/lemmatize.js`, `hooks/use-thesaurus.js`, `components/feature/ThesaurusPopover.jsx`. Modified: settings store/hook/panel, `SuggestionsTray.jsx` (hover + long-press handlers), `EntryCard.jsx` and `EntryDetailPanel.jsx` (added `addTriggers(words[])` batch helpers so multi-select Add doesn't lose words to stale `entry.triggers` reads), `limits.js` (`THESAURUS_SENSE_CAP = 5`, `THESAURUS_LONG_PRESS_MS = 450`). Known data-quality limitations: per-PoS granularity (not per-individual-sense), some senses return empty synonym arrays and get filtered out, archaic synonyms can appear (e.g., "sith" for "because"), and uncommon words 404 even after lemmatization. Follow-ups (Datamuse `ml=` backup, bundled local thesaurus, lemma-resolution disclosure in header) catalogued in Future Features.
- **Storage Usage Tracker:** A ring indicator in `WindowHeader` left of the menu button shows total `localStorage` usage against the browser's reported per-origin quota (`navigator.storage.estimate()` with a 5 MB Safari-floor fallback). Ring outline stays neutral; the fill arc colour-tiers at 60% (yellow) and 85% (red), matching the existing description/trigger warning convention. Desktop hover opens a one-line summary popover (`X.X MB / Y MB used (Z%)`); click (or mobile tap) opens a detail popover with a horizontal bar plus a breakdown across five categories — Snapshots, Entry content, Lorebook index, Settings, Window state — and a manual Refresh button. Recompute is write-driven: `storage-service.js` gained a tiny pub-sub (`subscribeToWrites`) that fires after every `writeJson`/`removeItem`, so the ring tracks actual storage changes without any timer or per-keystroke work. Schema knowledge stays in the hook — `use-storage-usage.js` injects a `measureLorebook(parsed)` callback into `getStorageBreakdown`, keeping `storage-service.js` schema-agnostic. New: `services/format-bytes.js`, `hooks/use-storage-usage.js`, `components/layout/StorageUsageRing.jsx`, `components/feature/StorageUsageHoverPopover.jsx`, `components/feature/StorageUsageDetailPopover.jsx`. Modified: `services/storage-service.js`, `constants/limits.js` (`STORAGE_QUOTA_FALLBACK_BYTES`, `STORAGE_WARN_THRESHOLD`, `STORAGE_DANGER_THRESHOLD`), `components/layout/WindowHeader.jsx`, `style.css`.
- **Storage Compression + Quota Correction:** `storage-service.js` now compresses every written value with `lz-string`'s `compressToUTF16` and decompresses on read. A short `LZ1:` prefix marks compressed blobs; values without it are treated as legacy plain JSON and parsed as-is, so existing user data stays readable and is silently re-saved compressed on the next write. No migration step. Typical JSON payloads shrink ~4–6×, so the effective in-`localStorage` ceiling rises from ~5 MB of raw JSON to ~20–30 MB. `getStorageBreakdown` decodes via the same helper before passing the parsed lorebook to `measureLorebook`, which now returns `{ snapshots, total }` (both uncompressed char counts) — storage-service applies the `snapshots/total` ratio to the actual (compressed) byte count for each `mkp_lorebook_*` key, so the Snapshots vs Entry content split in the detail popover stays meaningful after compression. Same change drops the broken `navigator.storage.estimate()` quota source (which was pulling the full origin-storage budget — IndexedDB + Cache + localStorage + … — and reporting tens to thousands of GB to users) in favour of a fixed `STORAGE_QUOTA_BYTES = 5 MB` constant; `getStorageQuota` is now synchronous and `use-storage-usage.js` consumes it directly. `MAX_LOREBOOKS` raised from 10 → 50 since the compressed headroom comfortably supports it. New dep: `lz-string` (~3 KB gzipped). Modified: `services/storage-service.js`, `hooks/use-storage-usage.js`, `constants/limits.js` (renamed `STORAGE_QUOTA_FALLBACK_BYTES` → `STORAGE_QUOTA_BYTES`, bumped `MAX_LOREBOOKS`), `package.json`.
- **Browser-Aware Quota Profile:** the storage ring now reports against either the 5 MB Safari/WebKit cap or the 10 MB Chromium/Gecko cap depending on a new `storageQuotaProfile` setting. `getStorageQuota(profile)` looks up `STORAGE_QUOTA_BYTES_BY_PROFILE[profile]` (falling back to the conservative `STORAGE_QUOTA_BYTES` if no profile is set). On first boot (or for users upgrading from a build before this setting existed), `App.jsx` UA-sniffs via `detectQuotaProfile()` — iOS/iPadOS UA → `'webkit'`, desktop Safari → `'webkit'`, everything else → `'chromium-gecko'` — and persists the result so the dropdown shows a sensible default. The profile lives on `settings-store` alongside the other prefs; `use-storage-usage` subscribes to it so the ring re-sizes immediately on change. The dropdown is surfaced in two places for discoverability: `SettingsPanel.jsx` under **Window & Layout**, and inside the click-opened `StorageUsageDetailPopover.jsx` just above the Refresh button. New constants in `limits.js`: `STORAGE_QUOTA_PROFILE_WEBKIT`, `STORAGE_QUOTA_PROFILE_OTHER`, `STORAGE_QUOTA_BYTES_BY_PROFILE`. Modified: `constants/limits.js`, `constants/defaults.js` (new `storageQuotaProfile: null` field), `state/settings-store.js`, `hooks/use-settings.js`, `hooks/use-storage-usage.js`, `services/storage-service.js` (`detectQuotaProfile`, profile-aware `getStorageQuota`), `App.jsx` (first-boot detect + persist), `components/feature/SettingsPanel.jsx`, `components/feature/StorageUsageDetailPopover.jsx`, `style.css`.
