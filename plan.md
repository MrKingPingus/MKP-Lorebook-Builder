# MKP Lorebook Builder — Implementation Plan

---

## Project Overview

MKP Lorebook Builder is a browser-only SPA for authoring AI lorebooks — structured collections of named entries with triggers, types, and descriptions that activate contextual information in LLM sessions. No backend, no accounts, no installation. All state lives in localStorage.

---

## Shared Systems

Three reusable infrastructure pieces that multiple future phases depend on. Each should be built generically the first time it is needed rather than as a one-off.

### Warning / Notification System
First needed in **Phase 7**. Used by: Trigger Crosstalk, Empty Field Notification, Entry Duplicate Warning, Entry Split chip. Should be a reusable UI primitive (and possibly a small entry-health evaluator service) so each consuming feature plugs in rather than invents its own alert pattern.

### Content Scanning Service (`scan-service.js`)
First needed in **Phase 7** (Trigger Crosstalk). Used by: Trigger Crosstalk, Entry Duplicate Warning, Entry Planner proper noun scanner. Pattern: accept the lorebook and a predicate, return findings. One service, multiple callsites.

### Diff System (`diff-service.js`)
First needed in **Phase 9** (Lorebook Crosstalk). Used by: Lorebook Crosstalk (core feature), Entry Duplicate Warning merge flow. Compares two entry objects field by field and returns a structured delta. Can be deferred until Phase 9 — nothing in Phases 6–8 strictly requires it.

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

- [ ] `lastModified` timestamp on entry schema — added in `entry-factory.js` and `defaults.js`; stamped in `lorebook-store.js` on every entry mutation; backwards-compatible default for existing saved entries
- [ ] Sort state in `ui-store.js` — session-only (not persisted); options: `default` (creation order), `alpha`, `last-modified`
- [ ] Sort mode UI — control added to the search bar area; wired to sort state
- [ ] Alphabetical sort — sorts visible entry list A–Z by entry name; applied in display layer
- [ ] Last modified sort — sorts visible entry list by `lastModified` descending; most recently edited entry first

### Stop Condition

User can switch sort mode to alphabetical and confirm entries reorder A–Z; switch to last modified and confirm the entry most recently edited appears first; edit an entry and confirm it moves to the top of the last modified view; reload the page and confirm sort resets to default order.

**Estimated Complexity:** Low

---

## Phase 7 — Trigger Enhancements

**Goal:** Trigger input is more flexible with expanded delimiter options, the app surfaces crosstalk between entries sharing triggers, suggestions are smarter and category-aware, and the Blurb Box gives users a natural way to add context that feeds better suggestions.

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
- [ ] Category-weighted suggestion variants — `suggestion-engine.js` applies different suggestion weights based on entry type; built alongside Blurb Box to avoid touching the file twice
- [ ] Blurb Box field — new optional textarea on entry cards for additional entry context; added to entry schema in `entry-factory.js` and `defaults.js`; backwards-compatible default
- [ ] Blurb Box feeds suggestion engine — `suggestion-engine.js` reads blurb content as an additional input source for trigger suggestions

### Stop Condition

User can switch compact trigger mode to a hyphen delimiter and confirm triggers parse correctly; add the same trigger to two entries and confirm a crosstalk warning appears on both; observe that suggestions for a character entry differ meaningfully from suggestions for a location entry; add content to the Blurb Box and confirm new suggestions reflect it.

**Estimated Complexity:** Medium

---

## Phase 8 — Entry Enhancements

**Goal:** Entries have richer authoring tools — markdown helpers, duplicate detection, empty field warnings, and an optional splitting system for entries that have grown too long.

### Features

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

### Stop Condition

User can insert a markdown bold marker via the dropdown and confirm it appears in the description; create two entries with the same name and confirm a duplicate warning appears; dismiss or merge them and confirm the result; create an entry exceeding the character limit, confirm split suggestions appear, split it, confirm two entries exist with matching triggers, and confirm the second entry has a bridging prefix when linear mode was selected.

**Estimated Complexity:** Medium–High

---

## Phase 9 — Global Features

**Goal:** The app can compare two lorebooks side by side for congruency, and users have a dedicated planner for drafting future entries.

### Features

**Diff System (prerequisite):**
- [ ] `diff-service.js` — compares two entry objects field by field and returns a structured delta; used by Lorebook Crosstalk and Entry Duplicate merge

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

User can load a second lorebook into crosstalk mode, confirm that entries present in both are diff'd and discrepancies surfaced, and run a search that returns results from both; user can create a planner note, convert it to an entry stub, and filter the build page to show only unfilled stubs.

**Estimated Complexity:** High

---

## Phase 10 — 2.0 / Deferred

**Goal:** Long-horizon features that require significant design work or depend on the full Phase 6–9 foundation being stable.

### Features (unordered — sequence TBD)

- [ ] **Lookup Table Trigger System** — categorised and genre-separated reference tables for trigger suggestions; weighted by active filters; separate from the live suggestion engine
- [ ] **Version history** — per-entry snapshot array (capped, stored on the entry); restore replaces current content; diff UI deferred until `diff-service.js` is stable
- [ ] **Entry Planner smart assistance** — extends the basic planner with proper noun scanning via `scan-service.js` to detect mentioned names without existing entries and prompt creation; scope and design TBD

### Stop Condition

TBD per feature at planning time.

**Estimated Complexity:** High
