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

## Phases 1–7 + Polish Passes — Completed ✅

All original planned features are implemented. Summary of what was built:

- **Phase 1 — MVP:** localStorage persistence, autosave, floating window shell, entry cards with name/type/description/triggers, JSON export
- **Phase 2 — Functional Baseline:** draggable/resizable window with viewport clamping, undo/redo, drag-to-reorder, collapse/expand, live search, type filter, char/trigger counters, duplicate prevention, bulk paste
- **Phase 3 — Feature Complete:** find & replace with deduplication, search highlight, group-by-type, inline chip editing, compact trigger mode, suggestions engine with tray/reroll/add, full import/export suite (JSON/TXT/DOCX/ZIP), import preview, multi-lorebook navigation, settings panel, keyboard shortcuts, lander
- **Phase 4 — Polish & Hardening:** description highlight overlay, Enter-key scroll-to-first-match, Shift+scroll type cycling
- **Phase 5 — Phrase Builder:** phrase builder mode, pill row with drag reorder, confirm/cancel
- **Phase 6 — Search & Sort Enhancements:** sort modes (alpha-asc/desc, last-modified), `lastModified` timestamp on entries, window size/position persistence, search results dropdown with location tags, Enter-key navigation through matches
- **Polish Pass 1:** export section header, find & replace inline layout, mobile dropdown width and menu button fixes, counter color corrections (disabled = green), undo/redo hotkey customization, new entry auto-focus, search ↔ find-replace text transfer, dropdown re-open on focus, Shift+click tooltip on type filter "All" pill
- **Phase 7 — Trigger Enhancements:** expanded delimiter options (6 choices) wired to settings-store, `scan-service.js` generic lorebook scanner, trigger crosstalk detection with yellow/blue chip rings and hover popover, Allow/Revoke acknowledgment system, `lorebook.allowedOverlaps` persistence
- **Polish Pass 2:** X button redirects to lander, lander section reorder (How It Works → Tips) with README link, double-click inline lorebook rename, new lorebook name modal, inline Yes/No delete confirmation, Find & Replace scope selector (chip toggles, Title/Triggers/Description/All), active field focus border changed to blue-grey (`--focus-border`), persistent yellow/red tiered borders on description and trigger fields

---

## Phase 8 — Entry Enhancements

> **Note:** This phase is large and should be considered for splitting into Phase 8a and 8b before implementation begins. Natural split point: 8a = authoring tools + limit overrides + duplicate detection; 8b = entry splitting + rollback system.

**Goal:** Entries have richer authoring tools — markdown helpers, duplicate detection, empty field warnings, an optional splitting system for entries that have grown too long, and an opt-in rollback system for saving and restoring entry states.

### Features

**Comparison Panel (prerequisite):**
- [ ] `ComparisonPanel` component — panel-within-window that slides in as a secondary pane following the `MenuPanel` pattern; holds two entry cards side by side; context-triggered by duplicate warning and split preview workflows
- [ ] Comparison panel hook — manages open/closed state and which two entries are loaded into the panel; wired to `ui-store`

**Warning / Notification System (prerequisite):**
- [x] Entry health evaluator — service that scans an entry or lorebook and returns structured findings for consumers to display; used by empty field notifications, duplicate warning, and split detection

**Entry Authoring:**
- [ ] Empty triggers/description notification — warning system alert when an entry has no triggers or an empty description

**Per-Entry Limit Overrides:**
- [x] Schema: add `ignoreLimitWarnings: { description: false, triggers: false }` to entry shape in `entry-factory.js` and `defaults.js`; backwards-compatible default of false
- [x] Description override toggle — appears next to the "1500 char limit" label on the description field when the char count crosses the yellow tier threshold; disappears if count drops back below threshold; toggling sets `ignoreLimitWarnings.description`; overridden field shows always-on blue (`#60a5fa`) border instead of yellow/red
- [x] Trigger override toggle — appears to the right of the "Trigger Keywords" label in the trigger section header when trigger count crosses `TRIGGER_WARN_YELLOW`; same show/hide and blue border behavior as description override; toggles `ignoreLimitWarnings.triggers`

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

**Lorebook JSON Metadata Portability (`_meta`)**
Add `createdAt` and `lastModified` timestamps to lorebook objects. Export: optional checkbox "Include metadata" appends a `_meta` block (timestamps + settings snapshot) to the JSON. Import: detect `_meta` block and prompt user to apply or skip the saved settings. Requires updates to `json-export.js`, `json-import.js`, lorebook creation, and `autosave.js`. Deferred from Polish Pass 2 — good idea but not yet worth the resource investment.

---

**In-App Help Menu / Documentation Panel**
A dedicated help section accessible from the UI (button or settings tab) containing usage guidance, tips, and feature explanations. Content scope and navigation structure not yet defined. Depends on: nothing technically blocking it, but content needs to be written before implementation makes sense. Deferred until user feedback clarifies what information users actually need surfaced in-app.

---

**Lookup Table Trigger System**
A categorised, genre-separated reference table for trigger suggestions — separate from the live suggestion engine. Users would browse or filter a curated list of triggers by type or genre and add them directly. Depends on: nothing currently built blocks it, but it is a substantial standalone feature. Would benefit from the suggestion engine architecture being stable first.

**Undo/Redo Overhaul**
The current undo/redo system is overzealous — it captures too many intermediate states. Needs a rethink of what constitutes a meaningful snapshot. Entirely independent of the rollback system. No dependencies, but low urgency until user feedback identifies specific pain points.

**Entry Planner Smart Assistance**
Extends the basic Entry Planner (Phase 9) with proper noun scanning via `scan-service.js` — detects names mentioned in planner notes that don't have existing entries and prompts the user to create them. Depends on: Entry Planner (Phase 9) and `scan-service.js` (Phase 7) both being complete.

**Lorebook Crosstalk — Second Window Mode**
The Phase 9 Lorebook Crosstalk uses a panel-within-window approach. For power users comparing large lorebooks, a second floating window may be more practical. Depends on: Phase 9 Lorebook Crosstalk being fully stable. Significant UI complexity — z-index management between two draggable windows.

**Category-Weighted Suggestion Variants**
`suggestion-engine.js` applies different suggestion weights and candidate pools based on entry type, so suggestions for a character entry differ meaningfully from those for a location entry. Requires a per-type lookup table or seed word list to have real impact. Deferred from Phase 7 until a lookup table approach is designed. Depends on: suggestion engine architecture being stable.

---

**Markdown Dropdown**
Helper UI on the description textarea for inserting common markdown formatting shortcuts (bold, italic, heading, bullet, blockquote, etc.); no parser, just insertion at cursor. Deferred because the target platform does not currently support markdown in lorebook entry descriptions. Revisit if platform support is added.

---

## Queued Adjustments

Items are moved into phases as they are assigned. Add new items here when discovered.

---

## Known Bugs

Bugs are listed with a status of **Open**, **In Progress**, or **Fixed**. Fixed bugs note the phase or commit where they were resolved.

---

**Crosstalk Popover Entry Navigation Does Not Work**
Clicking an entry name in the trigger crosstalk conflict popover does not scroll to or expand the target entry. Expected: clicking navigates to the entry the same way search result navigation does (scroll + expand on desktop, open detail panel on mobile).
Status: **Open**

---

**Firefox: Cursor Resets to Position 0 on Click in Text Fields**
Reported by a Firefox user on their second session (first session worked fine). Clicking within any text field positions the cursor at the start of the field rather than at the click location; keyboard navigation still works. Suspected causes: (1) stored window position from a previous session causing an invisible overlap on the content area — ask user to drag the floating window to center and retry; (2) `shouldFocusName` ref in EntryCard not being cleared when a new entry is created while the card is already expanded, causing `focus()` to fire on subsequent collapse/expand cycles. Both issues have been patched; if the bug persists, the window position stored in localStorage is the next thing to investigate.
Status: **Open** — patches applied, awaiting confirmation from reporter

---

**Full Type Button Grid Setting Has No Effect**
The "Full type button grid in entry editor" toggle in the settings panel does not appear to change anything in the entry editor. Expected: toggling this setting switches the type selector between a compact and full grid layout.
Status: **Open** — deferred; setting now displays a "currently broken" hint in the UI
