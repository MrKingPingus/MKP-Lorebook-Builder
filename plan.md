# MKP Lorebook Builder — Implementation Plan

---

## Phase 1 — MVP ✅

**Goal:** A user can create a lorebook with named, typed entries containing triggers and descriptions, auto-save it to localStorage, and download it as a JSON file.

### Features

- [x] Lorebook key bootstrap — creates the default storage slot on first launch; nothing can persist without it
- [x] New lorebook key allocation — assigns unique keys for lorebook storage; prerequisite for bootstrap
- [x] LocalStorage state persistence — read/write layer for all lorebook data; everything else depends on this
- [x] State snapshot builder — serializes current name + entries into a plain object; required by autosave and export
- [x] Debounced auto-save — writes to localStorage on a timer after changes; core durability contract of the app
- [x] Immediate save — forces a save on page unload and visibility change; prevents data loss when tab closes
- [x] Initial bootstrap — runs on launch to ensure a key exists and loads saved state; required to restore prior work
- [x] Load state — restores entries from a saved state object; called by bootstrap on every page load
- [x] Center-third default size — positions the window at first launch without user interaction; required before drag/resize is built
- [x] Tab bar (Build / Import/Export / Settings) — switches between panels; required to reach the export UI
- [x] Add Entry FAB — the primary way to create an entry; core action
- [x] Footer hint text — static "Alt+N — new entry" label; trivial markup, included here
- [x] Save badge — shows "✓ Saved" in the header; required UX feedback that autosave is working
- [x] Entry card factory — renders the entry card container; prerequisite for all entry field components
- [x] Entry name input — text field for the entry name; core entry datum
- [x] Type selector dropdown — choose from 5 entry types; core entry datum
- [x] Type color dot — colored stripe on the card header; required for type to be visually meaningful
- [x] Entry enum badge — auto-number label (#1 – Name); required for renumber to have visible effect
- [x] Description textarea — freeform text field for entry body; core entry datum
- [x] Description auto-grow — textarea expands as user types; without this, long descriptions break the UX
- [x] Trigger tag chips — add keyword triggers to an entry; core entry datum (triggers activate entries in AI)
- [x] Tag chip deletion — × button on each chip; minimum required editing for triggers
- [x] Add entry — creates a new blank entry; core action
- [x] Entry deletion — removes an entry with undo; core action
- [x] Renumber entries — re-labels enum badges after add/remove; required for coherent display
- [x] JSON export builder — serializes lorebook state to a structured JSON object; required for primary output
- [x] JSON download — triggers file download of the JSON blob; required for primary output

### Stop Condition

User can create 3 entries each with a name, type, 2+ triggers, and a description; observe "✓ Saved" appear automatically; download a .json file containing all 3 entries; reload the page; and see all 3 entries restored exactly as left.

**Estimated Complexity:** Medium

---

## Phase 2 — Functional Baseline

**Goal:** The window is interactive and resizable, entries can be reordered and collapsed, undo protects work, and basic search and type filtering make large lorebooks navigable.

### Features

- [ ] Draggable resizable window — floating window moves on header drag; the app's core UI metaphor, unusable without it
- [ ] Yellow corner resize handles — four corner drag handles to resize; required for the window to be user-controlled
- [ ] Viewport boundary clamping — prevents drag and resize from moving the window off-screen; safety requirement for drag/resize
- [ ] Undo stack — pushes a state snapshot before each mutation; protects against accidental edits
- [ ] Redo stack — restores undone snapshots; completes the undo/redo pair
- [ ] Undo/redo button state sync — enables and disables undo/redo buttons based on stack depth; required feedback
- [ ] Undo/redo buttons — UI buttons in the window header wired to the stacks; exposes undo/redo to the user
- [ ] Drag-and-drop reorder — drag an entry header to reorder the list; required for organizing entries
- [ ] Entry collapse/expand — hides/shows entry body via button or double-click on header; needed when managing long lorebooks
- [ ] Collapse All button — folds every entry body at once; depends on collapse being built
- [ ] Live full-text search — filters visible entries by name, triggers, or description as user types; essential for navigation
- [ ] Search bar with clear button — text input with one-click × clear; required UI for live search
- [ ] Type filter pill bar — toggle-pill row for filtering by entry type; required UI for type filter
- [ ] Type filter — hides/shows entries by selected types; the logic behind the pill bar
- [ ] Trigger/char stats badge — shows trigger count + char count in the collapsed entry header; needed once entries can be collapsed
- [ ] Tiered character counter — color-coded char count (green/yellow/red) against the 1500-char limit; actionable in-place guidance
- [ ] Trigger counter badge — shows current/max (25) trigger count with color warning inside the trigger area; pairs with trigger chips
- [ ] Duplicate trigger prevention — flashes an error if an added trigger already exists (case-insensitive); data integrity
- [ ] Bulk trigger paste — pastes a comma/semicolon-separated list to add multiple triggers at once; unblocks rapid data entry
- [ ] Auto-resize lorebook name input — the lorebook name field in the header expands/contracts to fit its text; small UX fix, trivial at this stage

### Stop Condition

User can drag the window to a corner and confirm it stops at the viewport edge; resize from all four corners; undo a deletion and redo it; use search to find an entry by trigger keyword; filter by two types simultaneously; collapse all entries; drag an entry to a new position in the list; paste 5 comma-separated triggers at once; and observe a flash error when adding a duplicate trigger.

**Estimated Complexity:** Medium

---

## Phase 3 — Feature Complete

**Goal:** Every planned feature is implemented — full import/export suite in all formats, multi-lorebook navigation, settings panel, suggestion engine with phrase builder, find-and-replace, group-by-type, and keyboard shortcuts.

### Features

**Search & Find-Replace (remaining):**
- [ ] HTML/regex escape utilities — XSS-safe HTML escaping and regex escaping; prerequisite for search highlight and safe find-replace operations
- [ ] Search mode switcher — toggles between Search and Find & Replace modes; gate for the F&R row
- [ ] Find & Replace row — second input row shown only in F&R mode; depends on mode switcher
- [ ] Find & Replace All — bulk-replaces text across all entries' triggers and descriptions; depends on html-escape and F&R row
- [ ] Post-replace deduplication — removes duplicate triggers created by a replace operation; must follow F&R All
- [ ] Match counter display — shows "X matches in Y entries" alongside the search bar; informational, depends on live search
- [ ] Search highlight — yellow-marks matching text within visible entry name and trigger fields; depends on html-escape
- [ ] Group by Type button — reorganizes visible entries into type-grouped blocks; completes the filter feature set
- [ ] Group by Type (logic) — the reordering logic behind the group-by-type button; pairs with the button

**Entry Card (remaining):**
- [ ] Inline tag chip editing — double-click chip label to edit trigger text in-place; refinement of chip UX
- [ ] Compact trigger text mode — single text field with a delimiter instead of chips; alternate input mode
- [ ] Delimiter switcher — toggles comma vs semicolon separator in compact mode; completes compact mode
- [ ] Description resize handle — draggable tab at the bottom of the textarea for manual height control; user control of layout
- [ ] Collapsible suggestions tray — per-entry expand/collapse tray; prerequisite for all suggestion display features
- [ ] Trigger suggestions engine — generates context-aware keyword suggestions from entry name/type/description; prerequisite for suggestions display
- [ ] Type-aware suggestion variants — filters suggestions by entry type; depends on suggestion engine
- [ ] Trigger suggestions display — shows up to 12 suggestions per entry inside the tray; depends on engine and tray
- [ ] Suggestion reroll — rotates to the next batch of suggestions with a spin animation; depends on suggestions display
- [ ] One-click suggestion add — adds a suggestion chip directly to triggers on click; depends on suggestions display

**Import/Export (full suite):**
- [ ] TXT template export builder — serializes lorebook to === header === block plain-text format; standalone export path
- [ ] TXT export — downloads lorebook as a .txt file; depends on TXT builder
- [ ] ZIP archive builder — produces a valid ZIP binary with CRC32 and central directory; prerequisite for DOCX export
- [ ] DOCX export builder — builds a minimal OOXML .docx blob using the ZIP builder; depends on ZIP builder
- [ ] DOCX export — downloads lorebook as a .docx file; depends on DOCX builder
- [ ] Parse plain-text import — parses key:value or === block === format text into entry objects; first import path
- [ ] Parse TXT template files — handles structured .txt with LOREBOOK: header; extends plain-text parser
- [ ] Parse DOCX files via Mammoth.js — dynamically loads Mammoth from CDN and extracts text; depends on TXT parser
- [ ] Import preview — shows parsed entries before committing to the store; depends on all three parsers
- [ ] File drag & drop upload — accepts dragged .txt/.docx files on the drop zone; depends on import parsers
- [ ] File browse upload — opens OS file picker on click of drop zone; completes the upload UI
- [ ] JSON generate & copy — builds JSON string and copies to clipboard with success feedback; clipboard variant of JSON export
- [ ] JSON import with validation — parses and validates JSON structure before loading; required for safe import
- [ ] Template downloads — downloads blank .txt and .docx import templates for user reference; depends on TXT/DOCX builders
- [ ] Clear all — deletes all entries and resets the lorebook name; required data management action
- [ ] Load state — restores a full state object into the store; called after import confirm and lorebook switch

**Lorebook Navigation:**
- [ ] Multi-lorebook index management — tracks metadata (name, timestamp) for up to 10 saved lorebooks; prerequisite for all switcher features
- [ ] Recent lorebook promotion — moves the most recently accessed lorebook to the front of the index; depends on index management
- [ ] Lorebook count badge — shows the number of saved lorebooks on the switcher button; depends on index management
- [ ] Lorebook switcher dropdown — dropdown listing all saved lorebooks with names and timestamps; depends on index management
- [ ] Lorebook timestamp display — shows "Saved Xm ago" relative time next to each lorebook in the dropdown; depends on switcher
- [ ] Lorebook delete — one-click delete of a lorebook entry in the switcher; depends on switcher
- [ ] Save prompt before switch — warns user and offers JSON/TXT download before switching away from current lorebook; depends on export + switcher
- [ ] Download-and-switch — downloads current lorebook and then immediately switches; depends on save prompt
- [ ] New lorebook creation — creates a new empty lorebook and switches to it; depends on index management
- [ ] Lorebook switch — loads a different saved lorebook into the active state; depends on index management

**Settings Panel:**
- [ ] Default window size dropdown — chooses Column (⅓ viewport) or Full Page as the default window size
- [ ] Reset window to default size — re-centers and resizes window to the chosen default
- [ ] Tiered character counter toggle — enables/disables the three-zone color coding on char count
- [ ] Compact trigger mode toggle — switches trigger input globally from chips to single text field
- [ ] Suggestions tray collapsed by default toggle — starts every entry's suggestions tray collapsed
- [ ] Hide entry stats toggle — hides trigger/char count badges from entry headers
- [ ] Hotkey input — customizes the Alt+key shortcut for new entry creation
- [ ] Settings preference persistence — saves all settings to localStorage on every change

**Keyboard Shortcuts:**
- [ ] Alt+N (configurable) new entry — creates a new entry without the mouse; depends on hotkey input setting
- [ ] Ctrl+Z undo — keyboard trigger for undo action; depends on undo stack
- [ ] Ctrl+Shift+Z / Ctrl+Y redo — keyboard trigger for redo action; depends on redo stack

**Lander & Initialization:**
- [ ] Desktop app launch button — opens the floating window from the lander page
- [ ] GitHub Pages direct link — links to the hosted version from the lander
- [ ] Template download links — downloads .txt and .docx templates directly from the lander
- [ ] Setup instructions — static step-by-step guide for desktop use on the lander

### Stop Condition

Every feature from the input list (except Phase 4 and 5 items) is implemented. User can: complete a full import/export round trip in JSON, TXT, and DOCX; switch between 3 lorebooks with working relative timestamps; run Find & Replace All and confirm duplicate triggers are removed; configure all settings and reload to verify they persist; use Alt+N, Ctrl+Z, and Ctrl+Shift+Z; and use the lander to open the app and download templates.

**Estimated Complexity:** High

---

## Phase 4 — Polish & Hardening

**Goal:** Overlay rendering for search highlights in descriptions is complete, scroll-based UX shortcuts are wired, and edge-case interactions in search are handled; the app feels complete and robust.

### Features

- [ ] Description highlight overlay — yellow highlights showing search matches inside the description textarea
- [ ] Enter key scroll-to-first — pressing Enter in the search bar scrolls to and focuses the first matching entry
- [ ] Scroll-wheel type switching — Shift+scroll on the type dropdown cycles through types

### Stop Condition

Search highlights appear correctly inside description textareas as the user types; pressing Enter in the search bar scrolls to the first match; Shift+scroll on any type dropdown cycles through all five types without interfering with any other scroll behavior.

**Estimated Complexity:** Low

---

## Phase 5 — Advanced / Nice-to-Have

**Goal:** The phrase builder provides a guided multi-word compound trigger authoring flow that enhances the suggestion experience for power users.

### Features

- [ ] Phrase builder mode — activates a compound trigger building mode from the suggestions tray
- [ ] Phrase pill row — displays selected suggestion words as reorderable pills in the builder
- [ ] Phrase confirm/cancel — commits the built phrase as a single trigger or discards it

### Stop Condition

User can click into phrase builder mode, select 3 suggestion words, drag them into a different order, confirm, and see the resulting space-joined phrase added as a single trigger chip. Cancelling at any step discards all selections with no side effects.

**Estimated Complexity:** Low

---

## Claude Code Prompt Sequence

**Prompt 1:** "Build Phase 1 MVP — implement localStorage persistence, autosave, the basic floating window shell, entry card with name/type/description/trigger chips, add/delete/renumber, and JSON download; scope to `src/services/storage-service.js`, `src/services/autosave.js`, `src/services/entry-factory.js`, `src/services/json-export.js`, `src/state/lorebook-store.js`, `src/state/history-store.js`, `src/constants/`, `src/hooks/use-autosave.js`, `src/hooks/use-lorebook.js`, `src/hooks/use-entries.js`, `src/components/layout/FloatingWindow.jsx`, `src/components/layout/TabBar.jsx`, `src/components/layout/WindowHeader.jsx`, `src/components/layout/WindowFooter.jsx`, `src/components/feature/EntryList.jsx`, `src/components/feature/EntryCard.jsx`, `src/components/feature/EntryName.jsx`, `src/components/feature/TypeSelector.jsx`, `src/components/feature/TriggerChips.jsx`, `src/components/feature/DescriptionArea.jsx`, and the relevant UI primitives; stop before drag/resize, search, undo, or export formats other than JSON."

**Prompt 2:** "Build Phase 2 Functional Baseline — implement window drag, corner resize with viewport clamping, undo/redo stack with buttons, drag-to-reorder entries, collapse/expand with Collapse All, live search with type filter, tiered char counter, trigger counter badge, duplicate prevention, and bulk paste; scope to `src/hooks/use-drag-window.js`, `src/hooks/use-resize-window.js`, `src/hooks/use-undo-redo.js`, `src/hooks/use-entries.js`, `src/hooks/use-search.js`, `src/hooks/use-type-filter.js`, `src/state/history-store.js`, `src/state/ui-store.js`, `src/components/layout/ResizeHandles.jsx`, `src/components/feature/SearchBar.jsx`, `src/components/feature/TypeFilterBar.jsx`, and the stats/counter UI primitives; stop before find-replace, suggestions, import, multi-lorebook, or settings."

**Prompt 3:** "Build Phase 3 Feature Complete — implement html-escape utilities, find-and-replace with deduplication, search highlight, group-by-type, inline chip editing, compact trigger mode, description resize handle, collapsible suggestions tray with engine/display/reroll/add, all import/export formats (TXT/ZIP/DOCX/JSON-import), import preview, drag-drop upload, multi-lorebook index with switcher/timestamps/delete/switch/create/save-prompt/download-and-switch, full settings panel with persistence, keyboard shortcuts (Alt+N / Ctrl+Z / Ctrl+Shift+Z), and the lander section; scope to all remaining files in `src/services/`, `src/hooks/`, `src/components/feature/`, and `src/state/settings-store.js`; stop before description overlay, Enter-scroll, scroll-wheel type switching, and phrase builder."

**Prompt 4:** "Build Phase 4 Polish & Hardening — implement the description highlight overlay in `src/components/feature/DescriptionHighlight.jsx`, Enter-key scroll-to-first-match in `src/hooks/use-search.js`, and Shift+scroll type cycling in `src/components/feature/TypeSelector.jsx`; stop before phrase builder."

**Prompt 5:** "Build Phase 5 Phrase Builder — implement phrase builder mode, pill row with drag reorder, and confirm/cancel in `src/hooks/use-phrase-builder.js` and `src/components/feature/PhraseBuilder.jsx`; wire into `src/components/feature/SuggestionsTray.jsx`."
