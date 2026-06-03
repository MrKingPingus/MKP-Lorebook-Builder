# Roadmap — Parked Features

Features not assigned to a phase. Documented to preserve intent and surface dependencies so implementation decisions can be made when the time is right.

**Grouped by the system they touch** — so related items can be picked up together in one session, and the file-touch list for each group is already visible. Group names line up with the system taxonomy in `components-reference.md` / `services-reference.md`.

---

## Entry editing & cards

**Entry Planner Smart Assistance**
Extends the basic Entry Planner (Phase 9) with proper noun scanning via `scan-service.js` — detects names mentioned in planner notes that don't have existing entries and prompts the user to create them. Depends on: Entry Planner (Phase 9) and `scan-service.js` (Phase 7) both being complete.

**Entry Splitting**
An optional system for breaking a long entry into two entries when it exceeds a length threshold. Includes:
- Split detection — identifies when an entry exceeds a threshold and suggests potential split points
- Entry split action — splits one entry into two; the second inherits all triggers from the first and a system-generated name suffix
- Linear/non-linear prompt — asks whether the split content is chronologically sequential; linear splits inject a bridging prefix phrase into the second entry's description
- Split chip — small badge on split entries indicating they are part of a pair
- Character limit override — allows entries in split mode to temporarily exceed `CHAR_LIMIT` until the split is confirmed

Deferred because current long-entry authoring via per-entry limit overrides is sufficient for now. Revisit if a structured split workflow becomes desirable.

**Markdown Dropdown**
Helper UI on the description textarea for inserting common markdown formatting shortcuts (bold, italic, heading, bullet, blockquote, etc.); no parser, just insertion at cursor. Deferred because the target platform does not currently support markdown in lorebook entry descriptions. Revisit if platform support is added.

**Hover Peek on Collapsed Entries**
Hovering a collapsed entry card reveals a temporary preview of its contents (name/type/triggers/description summary) without actually expanding it. Lets users skim a long lorebook without committing to expand/collapse cycles. Deferred from Polish Pass 4 — useful but non-trivial to implement without interfering with drag-to-reorder and existing hover states.

---

## Triggers & suggestions

**Lookup Table Trigger System**
A categorised, genre-separated reference table for trigger suggestions — separate from the live suggestion engine. Users would browse or filter a curated list of triggers by type or genre and add them directly. Depends on: nothing currently built blocks it, but it is a substantial standalone feature. Would benefit from the suggestion engine architecture being stable first.

**Category-Weighted Suggestion Variants**
`suggestion-engine.js` applies different suggestion weights and candidate pools based on entry type, so suggestions for a character entry differ meaningfully from those for a location entry. Requires a per-type lookup table or seed word list to have real impact. Deferred from Phase 7 until a lookup table approach is designed. Depends on: suggestion engine architecture being stable.

**Thesaurus Trigger Suggestions — Follow-ups**
The base feature shipped (see `history.md`). Two open follow-ups under consideration if data quality from `dictionaryapi.dev` proves limiting in real use:

1. **Datamuse `ml=` backup sense** — when the dictionary returns thin or empty synonym lists, append a final "Related" sense to the cycle pulled from Datamuse's means-like endpoint. Broadens the pool without bundling anything; cost is one extra HTTP request per word. Free, no API key, CORS-friendly. Worth doing if empty/sparse cases stay annoying after real authoring use; sense quality tradeoff is that `ml=` mixes loose semantic neighbours (sometimes including antonyms or surprising associations) where the dictionary returns curated thesaurus pairs.
2. **Bundle a frequency-filtered local thesaurus** — solves API outages, removes the outbound network dependency entirely, and gives precise control over data quality (filter archaic forms, name-spam, etc.) at the cost of a meaningful bundle hit (~1MB+ even gzipped/lazy-loaded). Only justified if API coverage stays poor after the Datamuse backup is wired; bundling without lemmatization wouldn't help, and we already have a rule-based lemmatizer. Probably overkill for the current data-quality complaints.
3. **Surface the resolved lemma in the header** — when the user hovers "lives" but synonyms come from the lemma "life", the header could show "Synonyms for 'lives' (via 'life')" so the user understands why the synonyms reflect the noun sense rather than the verb. Small clarity polish; service already returns the resolved word internally.

Notes on what won't be revisited unless something changes:
- Per-PoS granularity rather than per-sense — `dictionaryapi.dev` only populates the meaning-level synonym array, so cycling through "as in pleasing" / "as in moral" / "as in high-quality" senses of "good" within the adjective bucket isn't possible without a different data source. A paid sense-aware API (Merriam-Webster, Oxford) or an LLM call would be required.
- Archaic synonyms like "forthy" / "sith" appearing for "because" — these are legitimate WordNet/Wiktionary entries with no `archaic: true` flag the API exposes. Filtering would need a frequency dictionary, which is bundle-heavy.

---

## Crosstalk & reference

**Lorebook Crosstalk — Second Window Mode**
The Phase 9 Lorebook Crosstalk uses a panel-within-window approach. For power users comparing large lorebooks, a second floating window may be more practical. Depends on: Phase 9 Lorebook Crosstalk being fully stable. Significant UI complexity — z-index management between two draggable windows.

**All-Conflicts Panel**
Aggregate view of every trigger overlap across the active lorebook in one place — current crosstalk UI only surfaces conflicts per-entry. Would list each conflicting trigger with the entries that share it and provide batch Allow/Revoke actions at the lorebook level. Deferred from Polish Pass 4; Phase 9 Lorebook Crosstalk may subsume parts of this need.

**Lorebook Self-Reference**
Intra-book entry-vs-entry consistency analysis. Adaptation of crosstalk against a single book. Scope (reuse crosstalk pipeline vs. new field-level diff) to be decided when picked up. Parked from Polish Pass 5.

---

## Bulk operations

**Mass Move / Bulk Reorder**
Multi-select entries and move them together up or down in the list. Options considered: checkbox column with bulk move buttons, shift-click range selection, or drag-group. No design decision yet. Deferred from Polish Pass 4 because single-entry drag is sufficient for current lorebook sizes; revisit when users report reorder friction on larger books.

---

## Import / export & portability

**Lorebook JSON Metadata Portability (`_meta`)**
Add `createdAt` and `lastModified` timestamps to lorebook objects. Export: optional checkbox "Include metadata" appends a `_meta` block (timestamps + settings snapshot) to the JSON. Import: detect `_meta` block and prompt user to apply or skip the saved settings. Requires updates to `json-export.js`, `json-import.js`, lorebook creation, and `autosave.js`. Deferred from Polish Pass 2 — good idea but not yet worth the resource investment.

---

## Input & keyboard

**Hotkey & ESC Roadmap**
Polish Pass 5 Phase 2 wired `Escape` to exit bulk select mode (and cancel the pick-from-reference sub-pose) via `useKeyboardShortcuts({ onEscape })` in `App.jsx`. The `isTextInputFocused()` guard preserves local Escape semantics on inline editors and modal inputs. Open work, queued together for a future "hotkey pass":

1. **Extend Escape to other state-dependent modes.** Candidates: exit Find & Replace mode (`searchMode === 'find-replace'`), exit compare mode (clear `compareEntryId`), close any open popovers/menus that don't already self-handle Escape, dismiss the lander, dismiss the snapshot navigate-away prompt without saving. Each new target needs its priority worked out — e.g., if the user is in select mode AND compare mode, which exits first? The current handler is a single-layer cascade; a stack/priority approach may be needed.
2. **General appraisal of key configurations.** Audit every existing keyboard binding (the App-level `useKeyboardShortcuts`, plus all the local handlers found in `Chip.jsx`, `LorebookNameModal.jsx`, `TypeFilterBar.jsx`, `ThesaurusPopover.jsx`, `LorebookPanel.jsx`, `LorebookRoleBar.jsx`, `RollbackPanel.jsx`, `LorebookSwitcher.jsx`). Catalogue: where the binding lives, whether it's user-configurable, what guards it (focus checks, `e.stopPropagation`), and any collisions. Goal is a single source of truth and consistent guard rules.
3. **Wider selection of hotkeys.** Currently only New Entry, Undo, and Redo are user-configurable (Settings → Hotkeys, with Alt/Ctrl modifiers). Likely additions: toggle bulk select, save snapshot, toggle compare mode, jump to next/prev cross-match, focus search, focus find/replace, toggle crosstalk, swap reference, expand/collapse all entries. Needs a settings-store schema extension (each new action gets its own configurable key + modifier) and a dispatch table so `useKeyboardShortcuts` doesn't grow a wall of conditionals.

**Shift+Scroll on All Dropdowns**
`TypeSelector` already supports Shift+scroll to cycle through entry types without opening the dropdown. Extend this pattern to every other `<select>` in the app: the sort mode selector, the trigger delimiter selector (both in `EntryCard` and `EntryDetailPanel`), and any future dropdowns. The implementation is a self-contained `onWheel` handler on the `<select>` element — the existing `TypeSelector` code is the reference.

---

## Mobile & layout

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

## App shell

**In-App Help Menu / Documentation Panel**
A dedicated help section accessible from the UI (button or settings tab) containing usage guidance, tips, and feature explanations. Content scope and navigation structure not yet defined. Depends on: nothing technically blocking it, but content needs to be written before implementation makes sense. Deferred until user feedback clarifies what information users actually need surfaced in-app.
