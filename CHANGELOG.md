# Changelog

---

## Polish Pass 5 (Phase 5) — 2026-05-12

### Additions

- **FAB quick-add menu** — hovering the FAB on desktop or long-pressing it on touch now opens a small popover above the button with every available hotbar action (Undo, Redo, Clear All, Import Entries, Reference toggle). Tapping the FAB itself still adds an entry as before; the popover is purely additive. Hover delays favour intent: ~200ms to open, ~200ms to close, with a mouse bridge between the FAB and the menu so moving between them doesn't dismiss the popover. Touch long-press uses the same ~450ms threshold as the thesaurus chips and the synthetic click after release is suppressed so the FAB doesn't fire Add Entry on the way out. Tap outside the menu (or on another control) closes it on mobile.
- **All hotbar actions surface from the FAB** — the popover lists every registered hotbar action regardless of the user's slot configuration. `useHotbarActions` now returns an `allActions` array alongside `slots`, giving the FAB menu a discovery affordance for actions the user may not have pinned to their hotbar.

---

## Polish Pass 5 (Phase 4) — 2026-05-12

### Additions

- **Lander overhaul — five panels** — the launch view is now organized into Start tiles, Recent lorebooks, What's New, Learn, and Report a Bug instead of a single hero button plus three static sections.
- **Start tiles** — three large, clickable tiles for the most common first actions: **New Lorebook** (creates a fresh book and enters the builder), **Import File** (opens the Import / Export tab), **Import Paste** (opens the Import Entries popup in paste mode). The previous "Start Building →" button is replaced with a smaller "Continue to builder →" link in the footer for the I-just-want-to-keep-working case.
- **Recent lorebooks panel** — the top 6 lorebooks from the index are listed on the lander with their relative-time stamp. Clicking one switches to it and enters the builder in a single click. The currently-active book is flagged with a blue outline.
- **What's new panel** — bundles `CHANGELOG.md` at build time and renders it with a new hand-rolled markdown parser (no new dependencies). Scrollable container so the list stays compact; full history one scroll away.
- **Learn panel** — folds the previous How It Works and Tips sections plus the Import Templates row into a single Learn panel. Step copy refreshed to match the new tiles and adds the `Esc` shortcut to the hotkey list.
- **Report a Bug link** — lander footer now has a direct link to a pre-filled GitHub issue template (title prefix, `bug` label, sections for what happened / expected / repro / browser / console errors).

---

## Polish Pass 5 (Phase 3) — 2026-05-11

### Additions

- **Import Entries popup now handles three input modes** — a segmented control at the top of the footer "Import Entries" overlay picks between **Paste entries**, **Entries from file**, and **Whole book from file**. The paste and entries-from-file modes append to the active book. The whole-book mode parses a file and then asks whether to **Replace the active book** or **Import as a New Lorebook**, so a full book import no longer requires switching to the Import / Export tab.
- **Import tab gained an "Append to active" disposition** — after a file is parsed, the save / disposition prompt now offers `Append to active` alongside the existing `Replace` (with optional JSON / TXT backup) and `Import as New Lorebook` paths. Append skips the backup nudge since it doesn't replace data. The preview screen carries a one-line banner naming the chosen disposition so the user can see at a glance what `Confirm` will do.

### Fixes

- **First-run "New Lorebook" no longer lingers after an import** — the auto-created blank lorebook on first run is now marked as a placeholder. Choosing **Import as New Lorebook** from either the Import tab or the new whole-book mode in the popup silently discards the placeholder if it's still pristine (default name, zero entries). Users who land in the builder and immediately import are no longer left cleaning up an empty `New Lorebook` afterward.
- **First import from fresh storage no longer requires a retry** — `deleteLorebook` and `switchLorebook` in `use-lorebook.js` now read `lorebookIndex` and `activeLorebookId` from `useLorebookStore.getState()` instead of the React hook closure. The placeholder-discard step at the tail of `importAsNewLorebook` runs synchronously after `createLorebook`, so the closure was stale by the time `deleteLorebook` fired — `removeFromIndex(staleClosure, placeholderId)` returned `[]`, wiping the newly-created lorebook from the index. Manual deletes of the active lorebook had the same latent stale-closure problem in `switchLorebook` and are fixed by the same change.

---

## Polish Pass 5 (Phase 2) — 2026-05-11

### Adjustments

- **Bulk-select toolbar swap** — `Change Type… ▴` and the new `Apply Staged` button now sit on the **left** of the bulk action bar (adjacent to the entry-type column where the chips row drops down), while `× Exit`, `Select All Visible`, and `Deselect All` cluster on the **right**. Reduces the diagonal travel between picking a type and clicking the chip.
- **Select mode persists after Change Type** — applying a type to the selected entries no longer exits select mode or clears the selection. The same entries stay selected so further actions (re-applying a different type, copying, mixing in per-row stages) can be chained on the same set. `Copy to Other Panel` similarly stays in select mode (it still clears the selection since the originals were copied, not transformed).
- **Staged dropdown sits next to the entry name** — the per-row type dropdown now renders flush against the entry name rather than at the far right of the row, reducing the eye-travel between the name and the chooser. The card-header-right cluster (stats and action buttons) still floats to the far right.

### Additions

- **Per-row staged type changes** — while in select mode, each selected entry shows an inline type dropdown next to its name (desktop) or in its type slot (mobile). Picking a type **stages** the change without committing; a yellow border + glow flag rows whose staged type differs from their current type. A new amber `Apply Staged (N)` button appears in the bulk action bar when stages exist and commits all of them in one history snapshot. Stages clear on exit, on deselect, or when the apply-to-all `Change Type…` path runs. This is the deliberate flow for "change these three to Character, those two to Location, and that one to Item" in a single pass.
- **Escape exits select mode** — pressing the Escape key now exits bulk select mode (and cancels the mobile pick-from-reference sub-pose). The shortcut is suppressed while a text input or textarea is focused so inline editors and modal inputs keep their existing local Escape semantics. Future Escape targets (find/replace, compare mode, popovers) and a broader hotkey audit are catalogued in `docs/plan.md` under "Hotkey & ESC Roadmap".

---

## Polish Pass 5 (Phase 1) — 2026-05-11

### Renames

- **Rollback → Entry History** — the entry's snapshot button, tooltips, and Settings copy now use "Entry History" terminology throughout. The inactive state of the entry button reads "Enable entry history?" instead of the previously dimmed "↺ Rollback".

### Fixes

- **Skip really skips** — clicking Skip on the save-prompt dialog now closes the entry without saving a snapshot. Previously the prompt would dismiss but leave the entry open, forcing the user to commit to either Save New or Replace Latest.
- **Settings panel scroll** — the Settings tab now reliably scrolls when its section content exceeds the viewport. The scroll container now uses `flex: 1; min-height: 0` and `flex-shrink: 0` on each section so long sections (e.g. Editing & Entries fully expanded) no longer fall off the bottom of the screen.

### Adjustments

- **Native spellcheck on entry descriptions** — the description textarea now uses the browser's built-in spellchecker. Names, triggers, filenames, and other short or stylized fields remain unchecked.

---

## Crosstalk Compare Mode — 2026-05-09

### Additions

- **Side-by-side compare mode** — opens two entry cards (active and reference) side-by-side with live word-level diff annotations on every field.
- **Word-level diff service** — shared diff engine now powers both rollback snapshot comparisons and cross-pane comparisons.
- **Per-line diff outline boxes** — multi-line description diffs draw outline boxes around each changed line for easier scanning.
- **Desktop badges + cross-match sort** — crosstalk badges show on desktop; entries can be sorted by cross-book match count.
- **Fixed-column swap mode** — option to pin active/reference panels to fixed left/right columns (vs. the default click-to-swap behavior).

### Fixes

- **Copy-from-reference exits compare mode** — completing a field copy now exits compare mode and flips the matched-field badge to green.
- **Card height matching in compare mode** — both panels render at matched heights so the diff outline boxes line up.
- **Double-click bug in compare mode** — second click no longer collapses the wrong card.

---

## Mobile Description Alignment — 2026-05-06

### Fixes

- **iOS textarea / highlight overlay alignment** — the search-highlight overlay behind the description textarea now matches the textarea's iOS font-metric bumps so highlights stay aligned with the text on iPhone Safari.

---

## Thesaurus — 2026-05-05

### Additions

- **Synonym popover on suggestion chips** — hover (desktop) or long-press (mobile) a suggestion chip to open a synonym popover with definition cycling (◀ ▶), per-synonym selection, and an Add button.
- **Dictionaryapi.dev backend** — switched from Datamuse to dictionaryapi.dev for sense-disambiguated synonyms keyed off the meaning-level field.
- **Lemma fallback** — inflected words (plurals, past tense) retry against lemma candidates so look-ups don't silently miss.

### Fixes

- **Mobile selection + sticky hover + Add jitter** — popover stays open after the first tap, synonyms are tappable, Add button no longer jumps on press. Pagination replaced with native scroll.
- **Popover height stable** — height is locked across definition cycling so the popover doesn't reflow under the cursor.

---

## DOCX Import Recovery — 2026-05-05

### Fixes

- **DOCX heading/bold parsing** — entry boundaries are now recovered from heading and bold runs in the source document, so DOCX imports no longer collapse multiple entries into one block.

---

## Mobile Crosstalk — 2026-05-02 → 2026-05-03

### Additions

- **Overlay/annotation model** — mobile crosstalk surfaces shared triggers, same-named entries, and search hits in the paired book as inline annotations and overlays on the active book (no second panel).
- **Single-entry push + role-swap** — segmented control to swap which book is active, plus a single-entry push action for sending one entry to the paired book.
- **Pick from Reference pose** — multi-select pull pose with a pose-aware "in active" green pill while picking from the reference.
- **Reference picker moved to Lorebooks tab** — reference selection lives alongside the active book picker, not buried in Settings.

### Fixes

- **iOS auto-zoom on inputs** — disabled the iOS Safari font-size-based zoom on focused inputs.
- **z-index conflicts** — reference menu no longer renders under the backdrop; action buttons regained responsiveness; popovers raised above floating chrome.

---

## Crosstalk (Desktop Foundations) — 2026-04-25 → 2026-05-09

### Additions

- **Active + reference dual-book layout** — pairs a second lorebook as a read-only reference panel for browsing and cross-book operations.
- **Trigger crosstalk** — chips on shared triggers show a yellow ring (unacknowledged) or blue ring (acknowledged); hover opens a conflict popover listing entries that share the trigger. Acknowledgment ("Allow") and revocation persist per-lorebook.
- **Per-side find/replace** — match counters per book, scope toggles per book, Apply per book or Apply to Both.
- **Select mode across both panels** — bulk-select extended across the active and reference panels with Copy-to-other for the selected entries.
- **Crosstalk toggle surfaces** — added to LorebookPanel and as a hotbar action.
- **I-beam cursor on reference description** — visual affordance that the description body is selectable (read-only).

### Adjustments

- **Symmetric pane headers** — both panels share the same header layout; the redundant reference-name bar was consolidated into the header.
- **Hoisted filter bar** — search/filter/sort bar moved above the pane split so it spans both books in crosstalk mode.

---

## Undo/Redo Fix — 2026-04-08

### Fixes

- **Discrete entry actions now snapshot correctly** — changing an entry's type or adding, removing, or renaming a trigger chip now pushes a snapshot before the change, making each action individually undoable. Previously, `updateEntry` never pushed snapshots, so none of these changes were recorded in undo history.
- **Ctrl+Z no longer clobbers text field editing** — the global Ctrl+Z / Ctrl+Y handler now skips when a text input or textarea is focused, restoring native browser undo behaviour inside name and description fields. Previously, pressing Ctrl+Z while typing would jump back to the last structural snapshot (e.g. before the entry was created), discarding all text edits.

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
