# MKP Lorebook Builder

A browser-only utility for creating and managing lorebooks for AI chatbots. Built with React + Vite. No backend, no server, no authentication — everything runs and persists locally in the browser.

---

## Project Structure

```
/
├── index.html                 HTML shell with <div id="root"> mount point
├── vite.config.js             Vite build config with React plugin and GitHub Pages base path
├── package.json               Project manifest with React, Zustand, and Vite dependencies
└── src/
    ├── main.jsx               React entry point — mounts <App> into #root
    ├── App.jsx                Root component — composes FloatingWindow and LanderSection
    ├── style.css              Global CSS resets and design-token custom properties
    ├── constants/             Read-only configuration values — imported by services and hooks
    ├── state/                 Zustand stores — single source of truth for all runtime state
    ├── services/              Pure functions and side-effect-isolated modules — no React imports
    ├── hooks/                 Custom React hooks — bridge between stores and components
    └── components/
        ├── layout/            Structural shell components (window frame, tab bar, header, footer)
        ├── feature/           Domain-aware components wired to hooks (entry cards, panels, search)
        └── ui/                Stateless presentational primitives (chips, badges, FAB, drop zone)
```

---

## Folder Responsibilities

### `src/constants/`
Read-only values shared across the app. No logic, no side effects. Imported by services and hooks — never directly by components.

| File | Responsibility |
|------|----------------|
| `storage-keys.js` | All localStorage key name strings |
| `entry-types.js` | Entry type definitions: id, label, color |
| `limits.js` | Numeric caps: max triggers (25), max lorebooks (10), char thresholds |
| `defaults.js` | Default shapes for new entries, lorebooks, settings, window size |

### `src/state/`
Zustand stores — the single source of truth. Each concern gets its own store to prevent cross-concern re-renders. Components never import from this folder directly; they always go through a hook.

| File | Responsibility |
|------|----------------|
| `lorebook-store.js` | Active lorebook id, all lorebooks map, dispatch actions |
| `settings-store.js` | User preferences: compact triggers, counter tiers, default window size |
| `ui-store.js` | Active tab, search query, type filter, window position/size, collapse-all |
| `history-store.js` | Undo and redo stacks of full lorebook state snapshots |

### `src/services/`
Pure functions and isolated side-effect modules. No React imports. Services receive data and return data — they do not read from or write to stores directly.

| File | Responsibility |
|------|----------------|
| `storage-service.js` | **Only** file that reads/writes localStorage |
| `lorebook-index.js` | Multi-lorebook index: add, remove, promote, timestamp, key allocation |
| `entry-factory.js` | `createEmptyEntry()` and `createEmptyLorebook()` factory functions |
| `autosave.js` | Debounced autosave — subscribes to store, calls `storage-service` |
| `suggestion-engine.js` | Type-aware trigger keyword suggestions from entry data |
| `html-escape.js` | XSS-safe HTML escaping and regex special-character escaping |
| `find-replace.js` | Bulk find-and-replace across all entry trigger and description fields |
| `json-export.js` | Serialize lorebook to prettified JSON Blob |
| `json-import.js` | Validate and normalize imported JSON before applying to store |
| `txt-export.js` | Serialize lorebook to `=== header ===` block TXT Blob |
| `txt-import.js` | Parse `=== block ===` TXT format into entry objects |
| `docx-import.js` | Load Mammoth.js from CDN, extract text from `.docx`, delegate to `txt-import` |
| `docx-export.js` | Build OOXML `.docx` Blob via `zip-builder` |
| `zip-builder.js` | Construct valid ZIP binary with CRC32, local headers, central directory |

### `src/hooks/`
Custom React hooks — one per file, one concern each. The only layer that may import from both `state/` and `services/`. Components import hooks, never stores or services directly.

| File | Responsibility |
|------|----------------|
| `use-autosave.js` | Mount/unmount the autosave service as a React effect |
| `use-undo-redo.js` | `undo()`, `redo()`, `canUndo`, `canRedo` from `history-store` |
| `use-lorebook.js` | Active lorebook data and load/switch/create/delete actions |
| `use-entries.js` | Entry CRUD: add, update, remove, reorder, renumber |
| `use-search.js` | Search query, filtered entries, highlight positions, match count |
| `use-find-replace.js` | Find/replace fields, match count, dispatch to `find-replace` service |
| `use-type-filter.js` | Type filter toggle state and filtered entry list derivation |
| `use-drag-window.js` | Pointer-event drag logic for the floating window header |
| `use-resize-window.js` | Corner handle resize logic with viewport boundary clamping |
| `use-lorebook-switcher.js` | Lorebook list, relative timestamps, switch/create/delete |
| `use-suggestions.js` | Fetch, rotate, and add suggestions for an entry |
| `use-phrase-builder.js` | Phrase builder: word selection, ordering, commit, cancel |
| `use-settings.js` | Read and persist user preferences through `settings-store` |
| `use-keyboard-shortcuts.js` | Global handlers: Alt+N (new entry), Ctrl+Z (undo), Ctrl+Shift+Z (redo) |

### `src/components/layout/`
Structural shell components. Handle window framing, tab navigation, and global chrome. Receive data from hooks; do not contain business logic.

| File | Responsibility |
|------|----------------|
| `FloatingWindow.jsx` | Draggable resizable window shell — applies position/size from ui-store |
| `WindowHeader.jsx` | Title bar: lorebook name input, SaveBadge, undo/redo buttons |
| `TabBar.jsx` | Build / Import-Export / Settings tab switcher |
| `WindowFooter.jsx` | Footer: "Alt+N — new entry" hint and Add Entry FAB |
| `ResizeHandles.jsx` | Four corner drag handle elements wired to `use-resize-window` |

### `src/components/feature/`
Domain-aware components. Each maps to a specific feature area and is wired to one or more hooks. No direct store or service imports.

| File | Responsibility |
|------|----------------|
| `BuildPanel.jsx` | Build tab: SearchBar, TypeFilterBar, controls row, EntryList |
| `EntryList.jsx` | Scrollable sortable list of EntryCard components |
| `EntryCard.jsx` | Full entry card: name, type, triggers, description, suggestions |
| `EntryName.jsx` | Auto-sizing name text input |
| `TypeSelector.jsx` | Entry type dropdown with scroll-wheel cycling |
| `TriggerChips.jsx` | Chip-per-trigger input: inline edit, delete, bulk paste |
| `TriggerCompact.jsx` | Single text field triggers with delimiter switcher |
| `DescriptionArea.jsx` | Auto-growing textarea with manual resize handle |
| `DescriptionHighlight.jsx` | Yellow search-match highlight overlay for description |
| `SuggestionsTray.jsx` | Collapsible suggestions tray with reroll and one-click add |
| `PhraseBuilder.jsx` | Pill row for building compound trigger phrases |
| `SearchBar.jsx` | Search input, clear button, mode toggle, MatchCounter |
| `FindReplace.jsx` | Find and Replace row with Replace All button |
| `TypeFilterBar.jsx` | Pill button row to filter entries by type |
| `LorebookSwitcher.jsx` | Saved lorebooks dropdown with timestamps and delete |
| `ImportPanel.jsx` | Import tab: drop zone, file browse, format tabs, preview |
| `ImportPreview.jsx` | Read-only parsed entry preview before confirming import |
| `ExportPanel.jsx` | Export tab: JSON/TXT/DOCX downloads and templates |
| `SettingsPanel.jsx` | Settings tab: all user preference controls |

### `src/components/ui/`
Stateless presentational primitives. Receive only props, emit only callback props. No hook imports, no store imports.

| File | Responsibility |
|------|----------------|
| `Chip.jsx` | Trigger chip with editable label and × delete button |
| `FAB.jsx` | Floating action button for adding a new entry |
| `SaveBadge.jsx` | "✓ Saved" status indicator |
| `TypeColorDot.jsx` | Colored type stripe for entry card headers |
| `EntryBadge.jsx` | Entry enum badge (e.g. "#1 – Name") |
| `StatsBadge.jsx` | Trigger count and character count badge |
| `CharCounter.jsx` | Tiered color-coded character count (green/yellow/red) |
| `DropZone.jsx` | Drag-and-drop + click-to-browse file input zone |
| `MatchCounter.jsx` | "X matches in Y entries" search result display |

---

## Naming Conventions

| Convention | Applied to |
|------------|-----------|
| `PascalCase.jsx` | All React component files |
| `lowercase-hyphenated.js` | All non-component files (hooks, services, constants, state) |
| `use-*.js` | Custom React hooks |
| No `index.js` barrel files | Imports always reference the file directly |
| No `utils`, `misc`, `helpers`, `common` | Files are named after what they actually do |

---

## Architecture Rules

1. **One file, one responsibility** — no mixed concerns.
2. **Components render only** — all logic lives in hooks or services.
3. **No component imports stores directly** — always go through a hook.
4. **No component imports services directly** — always go through a hook.
5. **`storage-service.js` is the only file that touches `localStorage`** — no exceptions.
6. **`autosave.js` is a plain service, not a hook** — the debounce timer must survive React re-renders.
7. **Constants are never hardcoded in logic files** — always imported from `src/constants/`.
8. **Max folder depth: 3 levels** — `src/components/feature/` is the deepest allowed.
9. **No backend, no database, no authentication** — browser-only, localStorage only.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | UI rendering |
| `zustand` | Lightweight state management (4 isolated stores) |
| `@vitejs/plugin-react` | JSX transform and Fast Refresh in Vite |
| `vite` | Build tool and dev server |
| Mammoth.js (CDN) | DOCX text extraction — loaded dynamically at runtime, not bundled |

---

## Getting Started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

The app deploys automatically to GitHub Pages via `.github/workflows/main.yml` on push to `main`.
