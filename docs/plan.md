# MKP Lorebook Builder — Implementation Plan

---

## Project Overview

MKP Lorebook Builder is a browser-only SPA for authoring AI lorebooks — structured collections of named entries with triggers, types, and descriptions that activate contextual information in LLM sessions. No backend, no accounts, no installation. All state lives in localStorage.

---

## Current State

All planned phases through **Phase 10** have shipped (see **Completed** below). Day-to-day work now falls into three buckets:

- **Bugs & small adjustments** are tracked as **GitHub Issues** (`bug` / `enhancement` labels), not in this file. The former in-plan _Known Bugs_ and _Queued Adjustments_ lists were migrated there.
- **Larger unbuilt ideas** live under **Future Features** below — documented to preserve intent and surface dependencies, not committed to a phase.
- **Open / deferred TODOs** from otherwise-shipped phases are listed here so they aren't lost.

### Open / deferred

- **Verify hand-made JSON import** (follow-up to #102) — a reporter noted hand-made JSONs "wouldn't import," most likely malformed JSON (trailing commas / comments / smart quotes) rather than a schema issue. Needs the reporter's actual file to reproduce.
- **Entry-list keyboard navigation** (deferred from 10D) — a roving focus cursor + list ARIA so keyboard/screen-reader users can move through and act on entries. Also unblocks per-entry hotkeys (duplicate / delete / toggle *this* entry) if ever wanted. A feature in its own right.
- **Entry Planner** (parked from Phase 9) — see Future Features.
- **Mobile crosstalk redesign** (parked from Phase 9) — see Future Features.

---

## Future Features

Not assigned to a phase. Documented to preserve intent and surface dependencies so implementation decisions can be made when the time is right.

**Entry Planner (parked from Phase 9)**
Dedicated panel for notes and planned entry stubs, separate from the build panel; convert a planner note into a blank entry shell; a build-page filter to show only unfilled stubs. Deprioritized 2026-07-19 — a fun feature, but it keeps sliding down the list behind core functionality. The smart-assistance extension (proper-noun scanning via `scan-service.js`) is catalogued separately below.

**Entry Planner Smart Assistance**
Extends the basic Entry Planner with proper-noun scanning via `scan-service.js` — detects names mentioned in planner notes that don't have existing entries and prompts the user to create them. Depends on: the Entry Planner being built.

**Mobile crosstalk redesign (parked from Phase 9)**
Replaces the broken side-by-side layout on mobile with an overlay/annotation model. Anchor never moves without explicit gesture; reference content surfaces as inline annotations on active entries and one-deep peek overlays. Multi-select pull uses a temporary "pose" against the existing Select mode. Full plan and phasing in `docs/mobile-crosstalk-plan.md`.

**Icon / Symbol Library (replace emoji + text glyphs)**
Adopt a proper icon set (inline SVG sprite or a lightweight browser-only icon package) for UI affordances currently drawn with emoji or bare text characters — the FAB `+`, hotbar action icons, the 📌/⬇/⎘/↕ glyphs, etc. Motivations: consistent cross-platform rendering (emoji look different per-OS and don't inherit `currentColor`), crisper scaling, cleaner theming. _First step already taken 2026-07-23: the header bug/feature icons are inline SVG (`FeedbackLinks.jsx`)._ Scope to decide when picked up: which approach fits the layer rules and bundle budget, how icons are referenced from constants, and a migration order.

**Shift+Scroll on config dropdowns (follow-up)**
The reusable `components/ui/CyclingSelect.jsx` (shipped 2026-07-22) added Shift+scroll cycling to the content dropdowns (type, delimiter, search-mode) and the sort control. The remaining Settings/config selects (theme, storage profile, entry header height, window layout) were intentionally left on plain `<select>` — rarely-touched config, but adopting `CyclingSelect` there is a mechanical swap if wanted.

**Lorebook JSON Metadata Portability (`_meta`)**
Add `createdAt` / `lastModified` timestamps to lorebook objects. Export: optional "Include metadata" checkbox appends a `_meta` block (timestamps + settings snapshot). Import: detect `_meta` and prompt to apply or skip the saved settings. Touches `json-export.js`, `json-import.js`, lorebook creation, `autosave.js`.

**In-App Help Menu / Documentation Panel**
A dedicated help section (button or settings tab) with usage guidance, tips, and feature explanations. Nothing technically blocks it, but content needs writing first. Deferred until feedback clarifies what users actually need surfaced in-app.

**Lookup Table Trigger System**
A categorised, genre-separated reference table for trigger suggestions — separate from the live suggestion engine. Users browse/filter a curated list by type or genre and add directly. Substantial standalone feature; benefits from the suggestion-engine architecture being stable first.

**Category-Weighted Suggestion Variants**
`suggestion-engine.js` applies different weights and candidate pools per entry type, so suggestions for a character differ from those for a location. Needs a per-type lookup table / seed word list to have real impact. Depends on a lookup-table approach being designed.

**Thesaurus Trigger Suggestions — Follow-ups**
Open follow-ups if `dictionaryapi.dev` data quality proves limiting in real use:
1. **Datamuse `ml=` backup sense** — when the dictionary returns thin/empty synonyms, append a final "Related" sense from Datamuse's means-like endpoint. One extra request per word; free, no key, CORS-friendly. Tradeoff: `ml=` mixes looser semantic neighbours (sometimes antonyms).
2. **Bundle a frequency-filtered local thesaurus** — removes the network dependency and gives data-quality control, at a ~1MB+ bundle hit. Only justified if API coverage stays poor after the Datamuse backup.
3. **Surface the resolved lemma in the header** — e.g. "Synonyms for 'lives' (via 'life')" so users understand the noun-sense synonyms. Small clarity polish; the service already returns the resolved word.

Won't revisit unless something changes: per-PoS-vs-per-sense granularity (the API only populates meaning-level synonyms) and archaic synonyms ("sith" for "because") — filtering the latter needs a bundle-heavy frequency dictionary.

**Lorebook Crosstalk — Second Window Mode**
For power users comparing large lorebooks, a second floating window may beat the current panel-within-window approach. Depends on Phase 9 crosstalk being fully stable. Significant UI complexity — z-index management between two draggable windows.

**Lorebook self-reference**
Intra-book entry-vs-entry consistency analysis — an adaptation of crosstalk against a single book. Scope (reuse the crosstalk pipeline vs. a new field-level diff) to be decided when picked up.

**All-Conflicts Panel**
Aggregate view of every trigger overlap across the active lorebook in one place (current crosstalk surfaces conflicts per-entry). Lists each conflicting trigger with the entries that share it, plus batch Allow/Revoke at the lorebook level. Phase 9 crosstalk may subsume parts of this.

**Entry Splitting**
Optional system for breaking a long entry into two when it exceeds a length threshold: split detection + suggested split points; a split action (the second entry inherits triggers + a name suffix); a linear/non-linear prompt (linear splits inject a bridging prefix); a split-pair badge; and a temporary `CHAR_LIMIT` override until the split is confirmed. Deferred — per-entry limit overrides are sufficient for now.

**Hover Peek on Collapsed Entries**
Hovering a collapsed card reveals a temporary preview (name/type/triggers/description summary) without expanding it, so users can skim a long book. Non-trivial to implement without interfering with drag-to-reorder and existing hover states.

**Mass Move / Bulk Reorder**
Multi-select entries and move them together up/down. Options: checkbox column + bulk move, shift-click range, or drag-group. No design decision yet; single-entry drag is sufficient for current book sizes.

**Markdown Dropdown**
Helper UI on the description textarea for inserting common markdown (bold, italic, heading, bullet, blockquote); insertion at cursor, no parser. Deferred because the target platform doesn't currently render markdown in descriptions.

**Mobile Density Pass**
The mobile UI burns ~half the viewport on chrome before any entries show (header, search/sort row, type-filter chips, lorebook-name row, reference row, hotbar footer ≈ 490px). Ideas, ranked by ROI:
- Collapse top chrome into a sticky compact bar on scroll (name/reference/filters fold into a thin row with the entry count + a chevron). Recovers ~250px.
- Replace the chip-row type filter with a `Filter ▾ (n)` button opening a sheet. Recovers ~75–100px.
- Drop the visible `LOREBOOK NAME` / `REFERENCE` labels for placeholders + small icons. Recovers ~30–50px.
- Combine the name + reference rows when crosstalk is on.
- Auto-hide the name row on scroll; tap the header title to reveal.

User wants mockups before committing to a direction. Defer until after the mobile crosstalk redesign.

---

## Completed

All planned features through Phase 10 are implemented. Summary of what was built (full detail lives in git history and `CHANGELOG.md`):

### Phases 1–8 + early polish passes
- **Phase 1 — MVP:** localStorage persistence, autosave, floating window shell, entry cards (name/type/description/triggers), JSON export.
- **Phase 2 — Functional Baseline:** draggable/resizable window with viewport clamping, undo/redo, drag-to-reorder, collapse/expand, live search, type filter, char/trigger counters, duplicate prevention, bulk paste.
- **Phase 3 — Feature Complete:** find & replace with dedup, search highlight, group-by-type, inline chip editing, compact trigger mode, suggestions engine (tray/reroll/add), full import/export (JSON/TXT/DOCX/ZIP), import preview, multi-lorebook navigation, settings panel, keyboard shortcuts, lander.
- **Phase 4 — Polish & Hardening:** description highlight overlay, Enter-key scroll-to-first-match, Shift+scroll type cycling.
- **Phase 5 — Phrase Builder:** phrase builder mode, pill row with drag reorder, confirm/cancel.
- **Phase 6 — Search & Sort:** sort modes (alpha-asc/desc, last-modified), `lastModified` on entries, window size/position persistence, search results dropdown with location tags, Enter-key match navigation.
- **Phase 7 — Trigger Enhancements:** 6 delimiter options wired to settings, `scan-service.js` scanner, trigger crosstalk detection (yellow/blue chip rings + hover popover), Allow/Revoke acknowledgment, `lorebook.allowedOverlaps` persistence.
- **Phase 8 — Entry Enhancements:** entry health evaluator, per-entry limit overrides (blue border), opt-in rollback with snapshots, navigate-away save prompt, in-card snapshot preview + restore.
- **Polish Passes 1–4:** export header, F&R inline layout + scope selector, mobile dropdown/menu fixes, counter color corrections, hotkey customization, new-entry auto-focus, search↔F&R text transfer, X-to-lander, inline lorebook rename + name modal, inline delete confirm, tiered description/trigger borders, capitalized-trigger casing, backslash-artifact import fix, copy-to-clipboard templates, Allow-All-Overlap batch, Hide-from-Export with marker + popover, export filename override.

### Phase 9 — Global Features (crosstalk)
Active + reference model (chosen over a retracted dual-editor prototype that caused autosave clobber and store-sharing issues): `referenceLorebookId` on `lorebook-store`; read-only `ReferencePanel`; swap-on-edit-click; global search/filter/sort above the pane split; lateral find & replace (per-side Apply); `diff-service.js` (word-level LCS); cross-pane "in both ↗ / differs ⚖ / comparing ✎" badges; side-by-side compare mode with live diff annotations and `getClientRects()` outline overlays; cross-match sort modes; `crosstalkSwapMode` setting; rollback diff highlighting; Settings accordion reorganisation. Entry Planner and mobile-crosstalk redesign parked → Future Features.

### Polish Pass 5 — UI Refinements
Rollback→Entry History rename; Skip-really-skips; settings-panel scroll fix; native description spellcheck; CHANGELOG bootstrap; Select-mode upgrades (persisted selection, per-row staged type changes, Escape-exits); import-flow segmented modes + first-run placeholder discard; lander overhaul (recent books, start tiles, Learn + What's-New panels, report-a-bug link); FAB quick-add menu; thesaurus on attached triggers (Replace / Add-Similar).

### Workflow Overhaul (initiative)
Ongoing friction-sanding pass. Shipped: **Export hotbar action** (`make_export` + floating `ExportMenu`) and the **Add-to-hotbar quick action** from the redesigned horizontal FAB quick-menu (+ new default hotbar layout). New friction points get logged and graduate into work when picked up.

### Phase 10 — CharSnap Parity, Export Control, Themes & Accessibility
- **10A — CharSnap JSON parity (#102):** import reads `entryType`; export emits the CharSnap shape (keyed-object entries, `entryType` labels, `isPublic`); private-by-default; per-entry Public toggle; All Public / All Private hotbar actions; template uses the CharSnap exporter.
- **10B — Bulk Export Visibility:** folded into Select mode — `Set Visibility ▾` (Hidden/Shown) and `Set Public/Private ▾` expanders in `BulkActionBar`, one undoable step each; per-card Hide button retained.
- **10C-pre — Hotkey engine overhaul:** registry-driven engine (`constants/keybindings.js`, `services/keychord.js`); dispatch table; full capture-based rebinding; Escape priority stack (`services/dismiss-stack.js`); `?` cheat-sheet overlay; 13 wired actions.
- **10C — Color themes:** `data-theme` mechanism applied pre-render; light + high-contrast token blocks; custom theme editor (7 pickers, `color-mix`-derived rest, live WCAG readout); System theme following the OS.
- **10D — Accessibility:** Settings → Accessibility section; text-only UI scale (px→rem + `--ui-scale`); reduced motion (toggle + `prefers-reduced-motion`); high-contrast toggle; global `:focus-visible` ring; targeted ARIA labels; Hotkeys relocated here.

### Bug fixes & QoL pass (2026-07-22 → 07-23)
Expand-All→single-collapse bug (#112, pulse-based); removed the dead "full type button grid" setting (#98); Shift+scroll on content dropdowns via `CyclingSelect`; advisory entry-title length counter; entry header-height setting; lorebook-switch "Switch ▾" discoverability; lander "Import File" opens the picker and imports directly (no prompts/name-modal); hotbar Import rename + arrow; header bug/feature SVG icons (#113 item 3); centered lorebook-name input; enlarged/uniform header icons.

### Infrastructure
- **Storage usage ring** (`WindowHeader`) — total localStorage usage vs a fixed per-engine cap; hover summary + click detail popover with a five-category breakdown; write-driven recompute via a `storage-service.js` pub-sub.
- **Storage compression + quota correction** — `lz-string` (`compressToUTF16`) on every write with an `LZ1:` prefix; legacy plain-JSON values still read and re-save compressed (no migration). Fixed the inflated `navigator.storage.estimate()` quota → fixed cap; `MAX_LOREBOOKS` 10 → 50.
- **Browser-aware quota profile** — `storageQuotaProfile` (5 MB WebKit / 10 MB Chromium-Gecko), UA-detected on first boot and overridable in Settings and the ring's detail popover.
