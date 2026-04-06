# Changelog

---

## Polish Pass 2 — 2026-04-06

### Adjustments

- **X button** on the build page now returns to the lander instead of doing nothing.
- **Lander** section order changed: "How It Works" now appears before "Tips". A link to the GitHub README has been added at the bottom of the Tips section.
- **Lorebook rename** is now triggered by double-clicking a lorebook name in the selector (was single-click), preventing accidental edits when switching lorebooks.
- **New lorebook name modal** — creating a lorebook now opens a small centered dialog prompting for a name. Press Enter or click outside to confirm; click × to skip. The lorebook is created either way.

### Fixes

- **Lorebook delete confirmation** simplified to an inline Yes / No prompt (same on desktop and mobile). Previously required typing "Yes" on desktop and used a native browser dialog on mobile.
- **Find & Replace** now covers entry titles in addition to triggers and descriptions. The "Replace All" button has been replaced with a **"Replace (X)… ▾"** button that opens a scope popover with chip-style toggles for **All**, **Title**, **Triggers**, and **Description**. A **Proceed** button executes the replacement against the selected fields.
- **Active field border color** changed from red (`--accent`) to a neutral blue-grey (`--focus-border: #a0b5d6`). The new variable is defined in `style.css` and applied to all focused inputs and textareas.
- **Tiered field borders** — description and trigger fields now show a persistent yellow or red border when their content is at or above the warning threshold, regardless of focus. The neutral blue-grey border still only appears on focus (below the threshold). Both fields respect the `tieredCounterEnabled` setting.

---

## Polish Pass 1

- Export section header added to the Import / Export panel.
- Find & Replace moved to an inline layout within the search bar row.
- Mobile dropdown width and menu button display fixes.
- Counter color correction: disabled state now shows green (was incorrectly red).
- Undo/redo hotkeys now customizable in Settings.
- New entry auto-focuses the name field on creation.
- Switching from Search to Find/Replace (and back) transfers the current query text.
- Search dropdown re-opens on input focus if results exist.
- Shift+click on the "All" type filter pill now shows a tooltip explaining the shift-click behavior.

---

## Phase 7 — Trigger Enhancements

- Expanded delimiter options: 6 choices (comma, semicolon, pipe, slash, colon, tab), configurable in Settings and persisted to `settings-store`.
- `scan-service.js` — generic lorebook scanner service; accepts a lorebook and a predicate, returns findings.
- Trigger crosstalk detection: chips on conflicting triggers show a yellow ring (unacknowledged) or blue ring (acknowledged). Hovering opens a conflict popover listing the entries that share the trigger.
- Allow / Revoke acknowledgment system: conflicts can be marked as intentional ("Allow") or reverted ("Revoke"). Acknowledged overlaps persist per-lorebook in `lorebook.allowedOverlaps`.

---

## Phase 6 — Search & Sort Enhancements

- Sort modes: Default, A→Z, Z→A, Last Modified.
- `lastModified` timestamp added to all entry objects; updated on every edit.
- Window size and position persist across sessions via `ui-store` and `storage-service`.
- Search results dropdown shows matched entries with location tags (title / trigger / description).
- Enter key navigates through search matches in display order.

---

## Phase 5 — Phrase Builder

- Phrase Builder mode on trigger fields: compose a trigger from individual word pills with drag reorder, then confirm or cancel.

---

## Phase 4 — Polish & Hardening

- Description highlight overlay renders search matches as a visual layer behind the textarea.
- Enter key in the search bar scrolls to the first match.
- Shift+scroll on the type selector cycles through entry types.

---

## Phase 3 — Feature Complete

- Find & Replace with duplicate-trigger deduplication after replace.
- Search highlighting across entry name, triggers, and description.
- Group-by-type view mode.
- Inline chip label editing.
- Compact trigger mode (chips collapse to a count badge).
- Suggestions engine: type-aware keyword suggestions with tray UI, reroll, and one-click add.
- Full import/export suite: JSON, TXT, DOCX, ZIP bundle.
- Import preview panel before committing an import.
- Multi-lorebook support: up to 10 lorebooks, switchable from the header.
- Settings panel: counter tiers, compact triggers, default window size, keyboard shortcuts.
- Keyboard shortcuts: Alt+N (new entry), Ctrl+Z / Ctrl+Y (undo/redo), configurable modifier keys.
- Lander (welcome screen) with import templates and getting-started guide.

---

## Phase 2 — Functional Baseline

- Draggable and resizable floating window with viewport clamping.
- Undo/redo (up to 50 snapshots of full lorebook state).
- Drag-to-reorder entries via a handle.
- Collapse/expand all entries.
- Live search across name, triggers, and description.
- Type filter bar.
- Character counter and trigger count badge with tiered color thresholds.
- Duplicate trigger prevention with flash feedback.
- Bulk paste: comma-separated list into the trigger field adds multiple triggers at once.

---

## Phase 1 — MVP

- Browser-only SPA (React 18 + Vite). No backend, no accounts.
- Entry cards with name, type selector, trigger chips, and description textarea.
- Five entry types: Character, Location, Item, Plot Event, Other — each with a distinct color.
- localStorage persistence via autosave (800 ms debounce).
- JSON export.
