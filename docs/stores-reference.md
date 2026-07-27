# Zustand Stores Reference

Four isolated stores in `src/state/` to minimize re-renders.

| Store | Owns |
|-------|------|
| `lorebook-store.js` | `leftId`/`rightId`/`focusSide` slot state, `activeLorebookId` (mirrors focused slot), `lorebooks` map, `lorebookIndex`. Per-book: `entries`, `folders`, `allowedOverlaps`, `rollback` |
| `ui-store.js` | active tab, search query, type filter, `folderFilter` (folder ids + the `UNFILED_FILTER_ID` sentinel; active-book only, pruned on read via `use-folder-filter`), `selectionAnchorId` (where a shift+click range measures from; re-set by every click, cleared with the selection), window pos/size, `bulkExpanded` + `expandAllNonce`/`collapseAllNonce` (Expand/Collapse All pulses), `groupByType` |
| `settings-store.js` | user preferences (compact triggers, counter tiers, default window size) |
| `history-store.js` | undo/redo stacks (max 50 snapshots of full lorebook state). A snapshot is `{ entries }`, or `{ entries, folders }` for ops that touch the folder layer — `use-undo-redo` only writes folders back when the snapshot carried them |

Always use selector syntax: `const foo = useStore((s) => s.foo)`.
