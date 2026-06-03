# MKP Lorebook Builder — Implementation Plan

This file holds **only the active phase**. Everything else lives in dedicated docs:

- **`roadmap.md`** — parked / future features, grouped by the system they touch.
- **`history.md`** — completed phases and the implementation detail behind shipped work.
- **`CHANGELOG.md`** (repo root) — plain-language, user-visible record of what shipped.
- **Bugs** — tracked as GitHub Issues (`label:bug`), not in this repo. Query open issues when doing bug-fix work.

When a phase closes: move its bullets to `history.md`, migrate any constraint a future editor must honor into a code comment, and add a plain-language entry to `CHANGELOG.md`.

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

### Shipped so far in this phase

Detail in `history.md` → "Phase 9 — Global Features (completed items)".

- `diff-service.js` (structural entry delta, word-level LCS, powers rollback + compare highlighting)
- Lorebook Crosstalk (Active + Reference): reference panel, swap-on-edit-click, global search/filter/sort, lateral find & replace, cross-pane diff badges, side-by-side compare mode, cross-match sort modes, swap-mode setting, show/hide toggle
- Settings panel reorganised into four accordion sections
- Rollback diff highlighting

### Remaining work

**Mobile crosstalk redesign**
- [ ] Replaces the broken side-by-side layout on mobile with an overlay/annotation model. Anchor never moves without explicit gesture; reference content surfaces as inline annotations on active entries and one-deep peek overlays. Multi-select pull uses a temporary "pose" against the existing Select mode. Full plan and phasing in `docs/mobile-crosstalk-plan.md`.

**Entry Planner**
- [ ] Planner panel — dedicated panel for notes and planned entry stubs; separate from the build panel
- [ ] Entry stub creation — converts a planner note into a blank entry shell in the active lorebook
- [ ] Stub filter on build page — filter toggle to show only entries created from stubs that have not been fully authored yet

### Stop Condition

User can set a reference lorebook on the right side, see both active and reference lists render, click any edit-shaped element on the reference to swap (editing then occurs on that side), search across both panes from one global bar, and run find & replace with a per-side Apply; user can create a planner note, convert it to an entry stub, and filter the build page to show only unfilled stubs; user can open a saved rollback snapshot and click "Highlight Differences" to see field-level changes highlighted.

**Estimated Complexity:** Medium (reduced from High after the active+reference pivot)
