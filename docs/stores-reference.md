# Zustand Stores Reference

Four isolated stores in `src/state/` to minimize re-renders.

| Store | Owns |
|-------|------|
| `lorebook-store.js` | `leftId`/`rightId`/`focusSide` slot state, `activeLorebookId` (mirrors focused slot), `lorebooks` map, `lorebookIndex`. Per-book: `entries`, `folders`, `allowedOverlaps`, `rollback` |
| `ui-store.js` | active tab, search query, type filter, `folderFilter` (folder ids + the `UNFILED_FILTER_ID` sentinel; active-book only, pruned on read via `use-folder-filter`), `selectionAnchorId` (where a shift+click range measures from; re-set by every click, cleared with the selection), `selectAllVisibleNonce` (bumped by the Alt+V hotkey; serviced in `GlobalFilterBar`, the only component holding both panes' visible-id lists), window pos/size, `panelAnimating` (true only for the length of a side-panel open/close, because `left`/`width` are inline styles rewritten on every `pointermove` — a standing CSS transition on them rubber-bands drag and resize), `bulkExpanded` + `expandAllNonce`/`collapseAllNonce` (Expand/Collapse All pulses), `groupByType`, `mobileTitleMenuOpen`/`mobileTitleMenuTab`, `referenceChooserOpen` (one flag for all five doors into the chooser), and `closeAllLayers()` — the one action that shuts every dismissable layer, called when the viewport crosses the mobile breakpoint. Its list lives beside the fields it clears so adding a layer and forgetting to close it is a one-file mistake |
| `settings-store.js` | user preferences (compact triggers, counter tiers, default window size), `lorebookSort` (`recent` by default, `alpha` opt-in — every list of books reads it, so the title menu and the side panel can't disagree), `legacyMenus`. **No `crosstalkEnabled`** — crosstalk is derived from whether a reference book is paired (`use-reference-lorebook.js`); a stale key in an existing stored blob is inert |
| `history-store.js` | undo/redo stacks (max 50 snapshots of full lorebook state). A snapshot is `{ entries }`, or `{ entries, folders }` for ops that touch the folder layer — `use-undo-redo` only writes folders back when the snapshot carried them |

Always use selector syntax: `const foo = useStore((s) => s.foo)`.
