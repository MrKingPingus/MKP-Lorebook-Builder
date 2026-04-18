# Zustand Stores Reference

Four isolated stores in `src/state/` to minimize re-renders.

| Store | Owns |
|-------|------|
| `lorebook-store.js` | `leftId`/`rightId`/`focusSide` slot state, `activeLorebookId` (mirrors focused slot), `lorebooks` map, `lorebookIndex` |
| `ui-store.js` | active tab, search query, type filter, window pos/size, `expandAll`, `groupByType` |
| `settings-store.js` | user preferences (compact triggers, counter tiers, default window size) |
| `history-store.js` | undo/redo stacks (max 50 snapshots of full lorebook state) |

Always use selector syntax: `const foo = useStore((s) => s.foo)`.
