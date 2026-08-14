# Components Reference

## Component Layers (`src/components/`)

Three sub-folders, each with a distinct role:

| Layer | Purpose |
|-------|---------|
| `feature/` | Feature-specific, stateful components (entry cards, panels, toolbars) |
| `layout/` | Structural shell components (FloatingWindow, WindowHeader, Hotbar, MenuPanel) |
| `ui/` | Stateless, reusable primitives (Chip, DropZone, StatsBadge, CharCounter, TypeColorDot) |

## Feature Map — What You See → Where It Lives

Use this to identify which file to look at based on what's visible on screen.

### Layout (the window shell)

| What you see | File |
|---|---|
| The floating window itself (dark bordered frame with golden corners) | `src/components/layout/FloatingWindow.jsx` |
| The top bar: the lorebook title field (hover-highlighted; click opens the title menu, double-click renames in place), the gear, and close. Owns the title menu's open/close orchestration | `src/components/layout/WindowHeader.jsx` |
| The dual-column dropdown under the title — saved lorebooks on the left, import/export on the right. Portalled to `document.body`; the book column collapses to a rail once an import takes over | `src/components/feature/TitleMenu.jsx` |
| The mobile equivalent, opened by tapping the lorebook name in the role bar — same two destinations as two tabs rather than two columns, because 390px has no room for two of anything. Carries the per-book ⋯ menu (pair / rename / delete) and the ＋ New and ⇄ Reference footer | `src/components/feature/MobileTitleMenu.jsx` |
| The reference-lorebook chooser — what is paired, what can be paired, and a line saying what a reference lorebook *is*. Mounted once at the app root; opened from the mobile title menu, a book's ⋯ menu, the hotbar action, the Lorebooks panel and Settings | `src/components/feature/ReferenceChooser.jsx` |
| Which of those doors is open, and the candidate list behind it | `src/hooks/use-reference-chooser.js` |
| The order books are listed in, snapshotted on open so a list can't reshuffle under the pointer (`recent` default, `alpha` opt-in) | `src/hooks/use-sorted-lorebooks.js` |
| Closing every open layer when the viewport crosses the mobile breakpoint — the settings panel is a 320px column above it and a full-screen overlay below, and nothing re-poses between the two | `src/hooks/use-close-layers-on-breakpoint.js` |
| The bottom toolbar with action icons (add entry, undo, redo, etc.) | `src/components/layout/Hotbar.jsx` |
| The thin status bar below the hotbar (save state, `⤢ Size`) — desktop only. Holds app state and view controls; content actions belong in the hotbar | `src/components/layout/StatusFooter.jsx` |
| The `⤢ Size` menu and its flyouts (window size, text size, entry height, FAB size) — portalled to `document.body` so flyouts can open rightward past the window's `overflow: hidden` | `src/components/feature/ScaleMenu.jsx` |
| The vertical `LOREBOOKS` pull tab on the window's right edge | `src/components/layout/LorebookTab.jsx` |
| Window preset maths — apply a named size, report which one is live, re-centre and clamp | `src/hooks/use-window-scale.js` |
| The footer's "Saved / 4m ago" readout, derived from `ui-store.savedAt` | `src/hooks/use-save-status.js` |
| The gear button that opens Settings (top-right of header; a hamburger before 13C) | `src/components/layout/MenuButton.jsx` |
| The storage-usage ring in the footer, and its hover/click popovers | `src/components/layout/StorageUsageRing.jsx` |
| The bug + idea icons in the footer (moved out of the header in 13C) | `src/components/layout/FeedbackLinks.jsx` |
| Popover placement — flips a popover upward when its anchor sits low in the viewport, so a footer control's menu doesn't open off the bottom of the screen | `src/hooks/use-anchored-position.js` |
| The slide-out menu panel (import, export, settings, etc.) | `src/components/layout/MenuPanel.jsx` |
| The resize handles on window edges/corners | `src/components/layout/ResizeHandles.jsx` |

### Feature (the main content)

| What you see | File |
|---|---|
| The search bar at the top of the entry list | `src/components/feature/SearchBar.jsx` |
| The row of type filter pills (Character, Location, etc.) | `src/components/feature/TypeFilterBar.jsx` |
| An entry card (collapsed or expanded, with name/type/triggers/description) | `src/components/feature/EntryCard.jsx` |
| The scrollable list of all entry cards | `src/components/feature/EntryList.jsx` |
| A folder header row in the entry list (collapse, colour, name, count, delete) | `src/components/feature/FolderHeader.jsx` |
| The `Folder ▾` filter button and its checkbox menu (also supplies the rows TypeFilterBar drops into the mobile `Filter ▾` popover) | `src/components/feature/FolderFilterButton.jsx` |
| Folder filter state — selection, menu options, and the predicate that narrows a list. Active-book only; prunes stale ids on read | `src/hooks/use-folder-filter.js` |
| Drag-and-drop state machine (drop target, spring-loaded folders, auto-scroll, single-snapshot commit) — wired in `EntryList.jsx`; the folder header is the drag source for a folder | `src/hooks/use-entry-drag.js` |
| Modifier+click selection (shift/ctrl ranges) — wired in `EntryList.jsx` (owns the display-ordered id list) and handled on the capture phase in `EntryCard.jsx` / `FolderHeader.jsx` headers | `src/hooks/use-selection-macros.js` |
| The "Move to folder" button + menu in an entry card's footer | `src/components/feature/MoveToFolderButton.jsx` |
| The entry name field inside a card | `src/components/feature/EntryName.jsx` |
| The description textarea and its char counter | `src/components/feature/DescriptionArea.jsx` |
| The highlighted text overlay on descriptions (search matches) | `src/components/feature/DescriptionHighlight.jsx` |
| Trigger keyword chips inside an entry | `src/components/feature/TriggerChips.jsx` |
| The type selector dropdown/buttons on an entry | `src/components/feature/TypeSelector.jsx` |
| The suggestion tray below triggers (lightbulb + reroll) | `src/components/feature/SuggestionsTray.jsx` |
| Find & replace bar | `src/components/feature/FindReplace.jsx` |
| Phrase builder mode (pill row with drag reorder) | `src/components/feature/PhraseBuilder.jsx` |
| The bulk action bar (select all, delete selected, etc.) | `src/components/feature/BulkActionBar.jsx` |
| The lorebook tab switcher at the top | `src/components/feature/LorebookSwitcher.jsx` |
| The full lorebook management panel | `src/components/feature/LorebookPanel.jsx` |
| The "new lorebook name" popup | `src/components/feature/LorebookNameModal.jsx` |
| Import preview (before confirming an import) | `src/components/feature/ImportPreview.jsx` |
| The shared import flow — pick a file, choose what happens to the book you have open, confirm. Rendered by all three import surfaces, which is why they can't drift apart | `src/components/feature/ImportFlow.jsx` |
| That flow's state machine (`source` → `disposition` → `preview`), including the backup-then-replace path | `src/hooks/use-import-flow.js` |
| Import panel in the menu | `src/components/feature/ImportPanel.jsx` |
| Append import panel | `src/components/feature/AppendImportPanel.jsx` |
| Export panel in the menu | `src/components/feature/ExportPanel.jsx` |
| Settings panel in the menu | `src/components/feature/SettingsPanel.jsx` |
| Rollback panel (snapshot list inside an entry) | `src/components/feature/RollbackPanel.jsx` |
| The build panel (main entry editing view) | `src/components/feature/BuildPanel.jsx` |
| Mobile entry detail view (tapping an entry on mobile) | `src/components/feature/EntryDetailPanel.jsx` |
| The landing page (shown before opening a lorebook), including its *What's new* panel | `src/components/feature/Lander.jsx` |
| The "what changed" notice shown once per release on return | `src/components/feature/UpdateNotice.jsx` |
| The click-through tour of a release's annotated screenshots, opened from that notice or from *Take the tour* | `src/components/feature/FeatureTour.jsx` |
| Whether the notice is due, and the release it should show — reads the lorebook index from storage rather than the store, since the store hydrates after first render and a first-time user would otherwise be shown an update notice | `src/hooks/use-release-notes.js` |

### UI Primitives

| What you see | File |
|---|---|
| Small colored chips (tags, filters, etc.) | `src/components/ui/Chip.jsx` |
| The colored dot next to entry type labels | `src/components/ui/TypeColorDot.jsx` |
| Character count display on fields | `src/components/ui/CharCounter.jsx` |
| Match count display in search | `src/components/ui/MatchCounter.jsx` |
| Stats badge (entry count, etc.) | `src/components/ui/StatsBadge.jsx` |
| Drag-and-drop target zones | `src/components/ui/DropZone.jsx` |
| Rendered changelog markdown (the *What's new* panel and the update notice) | `src/components/ui/MarkdownView.jsx` |
