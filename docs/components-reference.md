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
| The top bar with lorebook name, minimize, and close buttons | `src/components/layout/WindowHeader.jsx` |
| The bottom toolbar with action icons (add entry, undo, redo, etc.) | `src/components/layout/Hotbar.jsx` |
| The hamburger menu button (top-left of header) | `src/components/layout/MenuButton.jsx` |
| The slide-out menu panel (import, export, settings, etc.) | `src/components/layout/MenuPanel.jsx` |
| The resize handles on window edges/corners | `src/components/layout/ResizeHandles.jsx` |

### Feature (the main content)

| What you see | File |
|---|---|
| The search bar at the top of the entry list | `src/components/feature/SearchBar.jsx` |
| The row of type filter pills (Character, Location, etc.) | `src/components/feature/TypeFilterBar.jsx` |
| An entry card (collapsed or expanded, with name/type/triggers/description) | `src/components/feature/EntryCard.jsx` |
| The scrollable list of all entry cards | `src/components/feature/EntryList.jsx` |
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
| Import panel in the menu | `src/components/feature/ImportPanel.jsx` |
| Append import panel | `src/components/feature/AppendImportPanel.jsx` |
| Export panel in the menu | `src/components/feature/ExportPanel.jsx` |
| Settings panel in the menu | `src/components/feature/SettingsPanel.jsx` |
| Rollback panel (snapshot list inside an entry) | `src/components/feature/RollbackPanel.jsx` |
| The build panel (main entry editing view) | `src/components/feature/BuildPanel.jsx` |
| Mobile entry detail view (tapping an entry on mobile) | `src/components/feature/EntryDetailPanel.jsx` |
| The landing page (shown before opening a lorebook) | `src/components/feature/Lander.jsx` |

### UI Primitives

| What you see | File |
|---|---|
| Small colored chips (tags, filters, etc.) | `src/components/ui/Chip.jsx` |
| The colored dot next to entry type labels | `src/components/ui/TypeColorDot.jsx` |
| Character count display on fields | `src/components/ui/CharCounter.jsx` |
| Match count display in search | `src/components/ui/MatchCounter.jsx` |
| Stats badge (entry count, etc.) | `src/components/ui/StatsBadge.jsx` |
| Drag-and-drop target zones | `src/components/ui/DropZone.jsx` |
