# MKP Lorebook Builder — Implementation Plan

---

## Project Overview

MKP Lorebook Builder is a browser-only SPA for authoring AI lorebooks — structured collections of named entries with triggers, types, and descriptions that activate contextual information in LLM sessions. No backend, no accounts, no installation. All state lives in localStorage.

---

## Phase 9 — Global Features

**Goal:** The app can show two lorebooks side by side for congruency-checking, lateral search, and lateral find & replace. Users have a dedicated planner for drafting future entries.

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
- [ ] **Mobile crosstalk redesign** — replaces the broken side-by-side layout on mobile with an overlay/annotation model. Anchor never moves without explicit gesture; reference content surfaces as inline annotations on active entries and one-deep peek overlays. Multi-select pull uses a temporary "pose" against the existing Select mode. Full plan and phasing in `docs/mobile-crosstalk-plan.md`.

**Settings Panel Reorganisation:**
- [x] Settings panel grouped into four collapsible accordion sections — **Editing & Entries**, **Reference & Crosstalk**, **Window & Layout**, **Hotkeys** — to declutter the long flat list. Editing & Entries is open by default.

**Rollback Diff Highlighting:**
- [x] `RollbackPanel` snapshot preview now has a "Highlight Differences" toggle wired to `diff-service.js`. When on, the preview shows a "● modified" dot beside each changed field label, the description renders inline `add`/`del` segments (green / red strikethrough), and triggers show common chips in neutral, added in green, removed in red strikethrough. A header chip reports the count of changed fields.

**Entry Planner:**
- [ ] Planner panel — dedicated panel for notes and planned entry stubs; separate from the build panel
- [ ] Entry stub creation — converts a planner note into a blank entry shell in the active lorebook
- [ ] Stub filter on build page — filter toggle to show only entries created from stubs that have not been fully authored yet

### Stop Condition

User can set a reference lorebook on the right side, see both active and reference lists render, click any edit-shaped element on the reference to swap (editing then occurs on that side), search across both panes from one global bar, and run find & replace with a per-side Apply; user can create a planner note, convert it to an entry stub, and filter the build page to show only unfilled stubs; user can open a saved rollback snapshot and click "Highlight Differences" to see field-level changes highlighted.

**Estimated Complexity:** Medium (reduced from High after the active+reference pivot)

---

## Future Features

Features noted here are not assigned to a phase. They are documented to preserve intent and surface dependencies so implementation decisions can be made when the time is right.

---

**Storage Usage Transparency**
A user-facing meter showing total localStorage consumed by the app, with a per-feature breakdown (lorebooks, settings, rollback snapshots, autosave drafts, any future caches). Browsers cap per-origin storage at 5–10 MB and the failure mode is silent — writes start throwing `QuotaExceededError` and autosave quietly fails. Becomes more important as rollback snapshots accumulate and as future features add cached data. Implementation lives in `storage-service.js` (the only file allowed to touch `localStorage` per architecture rules); a small panel in Settings shows current usage with a progress bar against an estimated quota. Per-feature breakdown requires a known key-prefix convention so `storage-service.js` can sum bytes by category — most existing keys already follow one. Depends on: nothing blocking. Worth doing before any feature lands that could introduce unbounded growth in localStorage.

---

**Lorebook JSON Metadata Portability (`_meta`)**
Add `createdAt` and `lastModified` timestamps to lorebook objects. Export: optional checkbox "Include metadata" appends a `_meta` block (timestamps + settings snapshot) to the JSON. Import: detect `_meta` block and prompt user to apply or skip the saved settings. Requires updates to `json-export.js`, `json-import.js`, lorebook creation, and `autosave.js`. Deferred from Polish Pass 2 — good idea but not yet worth the resource investment.

---

**In-App Help Menu / Documentation Panel**
A dedicated help section accessible from the UI (button or settings tab) containing usage guidance, tips, and feature explanations. Content scope and navigation structure not yet defined. Depends on: nothing technically blocking it, but content needs to be written before implementation makes sense. Deferred until user feedback clarifies what information users actually need surfaced in-app.

---

**Shift+Scroll on All Dropdowns**
`TypeSelector` already supports Shift+scroll to cycle through entry types without opening the dropdown. Extend this pattern to every other `<select>` in the app: the sort mode selector, the trigger delimiter selector (both in `EntryCard` and `EntryDetailPanel`), and any future dropdowns. The implementation is a self-contained `onWheel` handler on the `<select>` element — the existing `TypeSelector` code is the reference.

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
