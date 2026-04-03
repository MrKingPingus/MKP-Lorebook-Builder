# MKP Lorebook Builder — Implementation Plan

---

## Project Overview

MKP Lorebook Builder is a browser-only SPA for authoring AI lorebooks — structured collections of named entries with triggers, types, and descriptions that activate contextual information in LLM sessions. No backend, no accounts, no installation. All state lives in localStorage.

---

## Shared Systems

Four reusable infrastructure pieces that multiple future phases depend on. Each should be built generically the first time it is needed rather than as a one-off.

### Warning / Notification System
First needed in **Phase 7**. Used by: Trigger Crosstalk, Empty Field Notification, Entry Duplicate Warning, Entry Split chip. Should be a reusable UI primitive (and possibly a small entry-health evaluator service) so each consuming feature plugs in rather than invents its own alert pattern.

### Content Scanning Service (`scan-service.js`)
First needed in **Phase 7** (Trigger Crosstalk). Used by: Trigger Crosstalk, Entry Duplicate Warning, Entry Planner proper noun scanner. Pattern: accept the lorebook and a predicate, return findings. One service, multiple callsites.

### Comparison Panel
First needed in **Phase 8** (Entry Duplicate Warning merge, Entry Splitting preview). A panel-within-window component that slides in as a secondary pane within the existing floating window, following the same architectural pattern as `MenuPanel`. Holds two entry cards side by side for review and decision-making. Context-triggered (opens in response to a specific operation, not a standalone button). In Phase 9 the diff system layers field-level delta highlighting on top of this same panel — no rebuild required.

### Diff System (`diff-service.js`)
First needed in **Phase 9** (Lorebook Crosstalk). Used by: Lorebook Crosstalk (core feature), Entry Duplicate Warning merge flow. Compares two entry objects field by field and returns a structured delta. Plugs into the Comparison Panel built in Phase 8. Can be deferred until Phase 9 — nothing in Phases 6–8 strictly requires it.

---

## Phases 1–5 — Completed ✅

All original planned features are implemented. Summary of what was built:

- **Phase 1 — MVP:** localStorage persistence, autosave, floating window shell, entry cards with name/type/description/triggers, JSON export
- **Phase 2 — Functional Baseline:** draggable/resizable window with viewport clamping, undo/redo, drag-to-reorder, collapse/expand, live search, type filter, char/trigger counters, duplicate prevention, bulk paste
- **Phase 3 — Feature Complete:** find & replace with deduplication, search highlight, group-by-type, inline chip editing, compact trigger mode, suggestions engine with tray/reroll/add, full import/export suite (JSON/TXT/DOCX/ZIP), import preview, multi-lorebook navigation, settings panel, keyboard shortcuts, lander
- **Phase 4 — Polish & Hardening:** description highlight overlay, Enter-key scroll-to-first-match, Shift+scroll type cycling
- **Phase 5 — Phrase Builder:** phrase builder mode, pill row with drag reorder, confirm/cancel

---

## Phase 6 — Search & Sort Enhancements

**Goal:** The entry list can be sorted alphabetically or by last modified date, giving users meaningful navigation control over larger lorebooks.

### Features

- [ ] `lastModified` timestamp on entry schema — added in `entry-factory.js` and `defaults.js`; stamped in `lorebook-store.js` when entry fields change (name, type, description, triggers); drag-to-reorder and opening without editing do **not** stamp `lastModified`; entries without a timestamp (pre-Phase 6 saves) sort as oldest
- [ ] Sort state in `ui-store.js` — session-only (not persisted); options: `default` (current array order), `alpha-asc` (A–Z), `alpha-desc` (Z–A), `last-modified`
- [ ] Sort mode UI — menu button at the far right of the search field; opens a dropdown to select sort mode; button appearance reflects when a non-default sort is active
- [ ] All sort modes are display-only — sort never mutates the underlying entry array; `default` always restores the user's drag-arranged order
- [ ] Alphabetical sorts — `alpha-asc` sorts visible list A–Z by name (case-insensitive); `alpha-desc` sorts Z–A; when group-by-type is active, entries are sorted alphabetically within each type group
- [ ] Last modified sort — sorts visible list by `lastModified` descending; overrides group-by-type (flat list, no grouping); switching away from last-modified restores group-by-type if it was active

**Window Size & Position Persistence:**
- [ ] Persist window size and position to localStorage via `storage-service.js` — saved on every resize/drag end, restored on bootstrap via `useBootstrap`; falls back to default window size from `settings-store` if no persisted value exists
- [ ] Note for implementer — this behaviour previously existed and was removed; check git history before restoring to understand why it was changed and account for any edge cases (e.g. viewport clamping, cross-device size mismatches)

### Stop Condition

User can switch sort to A–Z and confirm entries reorder alphabetically (case-insensitive); switch to Z–A and confirm reverse order; switch to last modified, confirm group-by-type is overridden and the most recently edited entry appears first; edit an entry and confirm it moves to the top of the last modified view; drag an entry to a new position, confirm `lastModified` is not updated; reload the page and confirm sort resets to default and drag order is preserved; resize and reposition the floating window, reload the page, and confirm both size and position are restored.

**Estimated Complexity:** Low

---

## Phase 7 — Trigger Enhancements

**Goal:** Trigger input is more flexible with expanded delimiter options, the app surfaces crosstalk between entries sharing triggers, and suggestions are smarter and category-aware.

### Features

**Warning / Notification System (prerequisite):**
- [ ] Reusable warning UI primitive — consistent in-app alert component used across all warning features in this and later phases
- [ ] Entry health evaluator — service that scans an entry or lorebook and returns structured findings for consumers to display

**Delimiter Dropdown:**
- [ ] Expanded delimiter options — extends existing compact trigger mode to support hyphen, tilde, forward slash, and backslash in addition to comma and semicolon
- [ ] Delimiter selector dropdown — replaces existing two-option toggle with a dropdown; wired to `settings-store`

**Trigger Crosstalk:**
- [ ] `scan-service.js` — generic lorebook scanner built here as the first consumer; accepts a predicate, returns findings; reused by later phases
- [ ] Trigger crosstalk scan — uses `scan-service.js` to find triggers shared across two or more entries; reports findings via warning system
- [ ] Crosstalk indicator — surfaces shared trigger warnings on affected entries so users can spot conflicts in large lorebooks

**Suggestions:**
- [ ] Category-weighted suggestion variants — `suggestion-engine.js` applies different suggestion weights based on entry type

### Stop Condition

User can switch compact trigger mode to a hyphen delimiter and confirm triggers parse correctly; add the same trigger to two entries and confirm a crosstalk warning appears on both; observe that suggestions for a character entry differ meaningfully from suggestions for a location entry.

**Estimated Complexity:** Medium

---

## Phase 8 — Entry Enhancements

**Goal:** Entries have richer authoring tools — markdown helpers, duplicate detection, empty field warnings, an optional splitting system for entries that have grown too long, and an opt-in rollback system for saving and restoring entry states.

### Features

**Comparison Panel (prerequisite):**
- [ ] `ComparisonPanel` component — panel-within-window that slides in as a secondary pane following the `MenuPanel` pattern; holds two entry cards side by side; context-triggered by duplicate warning and split preview workflows
- [ ] Comparison panel hook — manages open/closed state and which two entries are loaded into the panel; wired to `ui-store`

**Entry Authoring:**
- [ ] Markdown dropdown — helper UI on the description textarea for inserting common markdown formatting; no parser, just insertion shortcuts
- [ ] Empty triggers/description notification — warning system alert when an entry has no triggers or an empty description

**Entry Duplicate Warning:**
- [ ] Duplicate entry detection — uses `scan-service.js` to identify entries with identical or near-identical names or trigger sets
- [ ] Duplicate warning display — surfaces findings via warning system; prompts user to review, merge, or dismiss
- [ ] Entry merge — merges two entries into one after user review; presents side-by-side fields for confirmation; uses `diff-service.js` once available in Phase 9, otherwise plain side-by-side display

**Entry Splitting:**
- [ ] Split detection — identifies when an entry exceeds a threshold and suggests potential split points
- [ ] Entry split action — splits one entry into two; the second entry inherits all triggers from the first and a system-generated name suffix
- [ ] Linear/non-linear prompt — asks whether the split content is chronologically sequential; linear splits inject a bridging prefix phrase into the second entry's description
- [ ] Split chip — small badge on split entries indicating they are part of a pair; uses warning system visual layer
- [ ] Character limit override — allows entries in split mode to temporarily exceed `CHAR_LIMIT` until the split is confirmed

**Entry Rollback System (opt-in):**
- [ ] `entry.snapshots` array on entry schema — capped array of snapshot objects `{ content, triggers, timestamp, label }`; added to `entry-factory.js` and `defaults.js`; backwards-compatible default of empty array
- [ ] Rollback settings in `settings-store.js` — rollback enabled toggle (default **Off**, per-lorebook); snapshot count selector: Off / 1 / 3 / 5 / Go with God (custom integer 1–10); count pre-selects 3 when first enabled; global "always enable rollback for new lorebooks" toggle
- [ ] Storage warning — surfaced in settings UI when count exceeds 5; explains localStorage pressure
- [ ] Greyed rollback button on entry card — visible but disabled when rollback is Off; hover tooltip explains how to enable it in settings; active when rollback is On
- [ ] Auto-snapshot on first edit — when rollback is enabled and a user edits an entry for the first time in a session, a snapshot is silently taken before the edit; every entry gets one free backup automatically
- [ ] Navigate-away prompt — when rollback is enabled and the entry has been edited since the last snapshot, collapsing the entry (desktop) or closing the panel (mobile) triggers a prompt: "Replace or Save New" with a "Don't ask again this session" option
- [ ] Manual rollback save — when prompts are suppressed, the rollback button saves a snapshot on demand; includes option to re-enable the prompt
- [ ] Rollback dropdown UI — lists saved snapshots; each labeled with timestamp by default, user-editable to a custom title
- [ ] Rollback Comparison Panel integration — selecting a snapshot opens the Comparison Panel showing snapshot vs. current entry state; includes a "Highlight Differences" button that is inert in Phase 8 (placeholder for Phase 9)
- [ ] Rollback restore — confirm action within the Comparison Panel replaces current entry content with the snapshot; action is undoable via existing undo/redo stack
- [ ] Independent from undo/redo — rollback system has no connection to `history-store.js`; they operate entirely separately

### Stop Condition

User can insert a markdown bold marker via the dropdown and confirm it appears in the description; create two entries with the same name and confirm a duplicate warning appears; dismiss or merge them and confirm the result; create an entry exceeding the character limit, confirm split suggestions appear, split it, confirm two entries exist with matching triggers, and confirm the second entry has a bridging prefix when linear mode was selected; enable rollback in settings, edit an entry, navigate away and confirm the "Replace or Save New" prompt appears, save a new snapshot with a custom label, open the rollback dropdown, select a snapshot, confirm the Comparison Panel opens showing both states, and restore the snapshot.

**Estimated Complexity:** High

---

## Phase 9 — Global Features

**Goal:** The app can compare two lorebooks side by side for congruency, and users have a dedicated planner for drafting future entries.

### Features

**Diff System (prerequisite):**
- [ ] `diff-service.js` — compares two entry objects field by field and returns a structured delta; used by Lorebook Crosstalk, Entry Duplicate merge, and rollback highlighting
- [ ] Rollback diff highlighting — wires `diff-service.js` into the rollback Comparison Panel; activates the previously inert "Highlight Differences" button; field-level delta highlighting renders between snapshot and current entry state

**Lorebook Crosstalk:**
- [ ] Secondary lorebook loader — loads a second saved lorebook into a read-only comparison instance without disturbing the active lorebook
- [ ] Cross-lorebook entry diff — uses `diff-service.js` to compare matching entries across both lorebooks and surface discrepancies
- [ ] Lateral search — extends search to operate across both lorebooks simultaneously
- [ ] Lateral find & replace — extends find & replace to operate across both lorebooks with per-lorebook confirmation

**Entry Planner:**
- [ ] Planner panel — dedicated panel for notes and planned entry stubs; separate from the build panel
- [ ] Entry stub creation — converts a planner note into a blank entry shell in the active lorebook
- [ ] Stub filter on build page — filter toggle to show only entries created from stubs that have not been fully authored yet

### Stop Condition

User can load a second lorebook into crosstalk mode, confirm that entries present in both are diff'd and discrepancies surfaced, and run a search that returns results from both; user can create a planner note, convert it to an entry stub, and filter the build page to show only unfilled stubs; user can open a saved rollback snapshot in the Comparison Panel and click "Highlight Differences" to see field-level changes highlighted.

**Estimated Complexity:** High

---

## Future Features

Features noted here are not assigned to a phase. They are documented to preserve intent and surface dependencies so implementation decisions can be made when the time is right.

---

**Lookup Table Trigger System**
A categorised, genre-separated reference table for trigger suggestions — separate from the live suggestion engine. Users would browse or filter a curated list of triggers by type or genre and add them directly. Depends on: nothing currently built blocks it, but it is a substantial standalone feature. Would benefit from the suggestion engine architecture being stable first.

**Undo/Redo Overhaul**
The current undo/redo system is overzealous — it captures too many intermediate states. Needs a rethink of what constitutes a meaningful snapshot. Entirely independent of the rollback system. No dependencies, but low urgency until user feedback identifies specific pain points.

**Entry Planner Smart Assistance**
Extends the basic Entry Planner (Phase 9) with proper noun scanning via `scan-service.js` — detects names mentioned in planner notes that don't have existing entries and prompts the user to create them. Depends on: Entry Planner (Phase 9) and `scan-service.js` (Phase 7) both being complete.

**Lorebook Crosstalk — Second Window Mode**
The Phase 9 Lorebook Crosstalk uses a panel-within-window approach. For power users comparing large lorebooks, a second floating window may be more practical. Depends on: Phase 9 Lorebook Crosstalk being fully stable. Significant UI complexity — z-index management between two draggable windows.

**Search Results Dropdown**
When a term is typed in the search field, a dropdown lists every entry the term appears in, with an indicator of where the match occurs (title, trigger, description, or a combination). Complements the Enter-key navigation added in Phase 6. Scope and interaction design TBD — discuss before planning.

---

## Queued Adjustments

Small improvements and fixes that have been identified but not yet assigned to a phase. Move each item into the appropriate phase once placement is decided.

---

**Undo / Redo Hotkey Customization**
The hotbar currently supports a customizable hotkey for adding a new entry but not for undo or redo. Both should be customizable to match.

**Character Counter Color Scope & Default**
The "Tiered character counter colors" setting currently turns counters grey when disabled — it should default to green. The setting should also affect the trigger count, not just the description character counter. The setting title should be updated to reflect that it covers both counters.

**Export Section Header**
The Import/Export tab has an "I M P O R T" header for the import section but no equivalent header for the export section. Add "E X P O R T" in the same format (spaced letters, underlined) for consistency.

**Enter-Key Search Navigation**
Pressing Enter while a search term is active should open (expand/scroll to) the first matching entry. Pressing Enter again should advance to the next match. Wraps at the end of the list.

**Find & Replace Replaces Search Field**
When Find & Replace mode is active, the regular search field should be hidden — replaced by the find and replace fields. No reason for all three to be visible simultaneously.

**Shift+Click Tooltip on "All" Option**
The "shift+click for multi select" tooltip currently appears on type filter chips but not on the "All" option. It should.

---

## Known Bugs

Bugs are listed with a status of **Open**, **In Progress**, or **Fixed**. Fixed bugs note the phase or commit where they were resolved.

---

**Full Type Button Grid Setting Has No Effect**
The "Full type button grid in entry editor" toggle in the settings panel does not appear to change anything in the entry editor. Expected: toggling this setting switches the type selector between a compact and full grid layout.
Status: **Open**
