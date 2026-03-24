# Phase 2 — Functional Baseline: Implementation Plan

## Context

Phase 1 delivered a working lorebook editor with entry CRUD, JSON export, and localStorage persistence. Phase 2 makes the app fully interactive: the floating window is draggable and resizable, entries can be reordered and collapsed, undo/redo protects work, and search + type filtering make large lorebooks navigable.

After auditing every Phase 2 target file, **most features are already scaffolded** in the Phase 1 codebase. Phase 2 consists of fixing four gaps and verifying the complete feature set works end-to-end.

---

## Current State Audit

### Already implemented and wired (no changes needed)

| Feature | File |
|---|---|
| Undo/redo stack | `src/state/history-store.js` |
| Undo/redo hook | `src/hooks/use-undo-redo.js` |
| Undo/redo buttons + disabled state | `src/components/layout/WindowFooter.jsx` |
| Keyboard shortcuts (Alt+N, Ctrl+Z, Ctrl+Shift+Z) | `src/hooks/use-keyboard-shortcuts.js`, `src/App.jsx` |
| Resize handles + viewport clamping | `src/hooks/use-resize-window.js`, `src/components/layout/ResizeHandles.jsx` |
| Drag-and-drop reorder | `src/components/feature/EntryList.jsx`, `src/hooks/use-entries.js:reorderEntries` |
| Entry collapse/expand (local state) | `src/components/feature/EntryCard.jsx` |
| Expand All toggle | `src/components/feature/TypeFilterBar.jsx`, `src/state/ui-store.js:expandAll` |
| Live full-text search | `src/hooks/use-search.js`, `src/components/feature/SearchBar.jsx` |
| Search clear button | `src/components/feature/SearchBar.jsx` |
| Type filter pill bar + logic | `src/hooks/use-type-filter.js`, `src/components/feature/TypeFilterBar.jsx` |
| Trigger/char stats badge (collapsed header) | `src/components/ui/StatsBadge.jsx` (used in `EntryCard.jsx`) |
| Tiered char counter | `src/components/ui/CharCounter.jsx` (used in `DescriptionArea.jsx`) |
| Duplicate trigger prevention | `src/components/feature/TriggerChips.jsx:addTrigger` |
| Bulk trigger paste | `src/components/feature/TriggerChips.jsx:onPaste` |
| BuildPanel composition | `src/components/feature/BuildPanel.jsx` |

---

## Gaps to Fix (4 items)

### Gap 1 — Drag viewport clamping missing
**File:** `src/hooks/use-drag-window.js`

The `onMove` callback sets position freely without checking viewport bounds. `use-resize-window.js` already shows the correct pattern.

**Fix:** Read `windowSize` from `useUiStore` and clamp in `onMove`:

```js
const MIN_HEADER_HEIGHT = 48;

// inside onMove, replace setWindowPos call:
const clampedX = Math.max(0, Math.min(ev.clientX - startX, window.innerWidth  - windowSize.width));
const clampedY = Math.max(0, Math.min(ev.clientY - startY, window.innerHeight - MIN_HEADER_HEIGHT));
setWindowPos({ x: clampedX, y: clampedY });
```

`windowSize` needs to be read from `useUiStore` (already imported). `MIN_HEADER_HEIGHT = 48` keeps the header always accessible; define it as a local constant in the file.

---

### Gap 2 — Collapse All signal not wired into EntryCard
**Files:** `src/components/feature/TypeFilterBar.jsx`, `src/components/feature/EntryCard.jsx`

**Problem:** `ui-store.js` has a `collapseAll` flag that is never read. `TypeFilterBar` toggles `expandAll` for both expand and collapse. When `expandAll` becomes false ("Collapse All"), entries that were *manually* expanded (localCollapsed=false) stay expanded because `collapsed = expandAll ? false : localCollapsed`.

**Fix — two-part:**

**Part A — TypeFilterBar:** On "Collapse All" click, set both flags (`setCollapseAll(true)` and `setExpandAll(false)`). On "Expand All" click, set `setExpandAll(true)` and `setCollapseAll(false)`:

```jsx
onClick={() => {
  if (expandAll) {
    setExpandAll(false);
    setCollapseAll(true);
  } else {
    setExpandAll(true);
    setCollapseAll(false);
  }
}}
```

**Part B — EntryCard:** Read `collapseAll` and use `useEffect` to force-reset localCollapsed when either signal fires:

```jsx
const collapseAll = useUiStore((s) => s.collapseAll);
const expandAll   = useUiStore((s) => s.expandAll);

useEffect(() => { if (collapseAll) setLocalCollapsed(true);  }, [collapseAll]);
useEffect(() => { if (expandAll)   setLocalCollapsed(false); }, [expandAll]);

// Remove the old derived `collapsed` line; just use localCollapsed directly:
const collapsed = localCollapsed;
```

---

### Gap 3 — Trigger counter badge missing inside trigger area
**File:** `src/components/feature/TriggerChips.jsx`

Plan requirement: "Trigger counter badge — shows current/max (25) trigger count with color warning inside the trigger area."

The header `StatsBadge` covers combined stats but the plan calls for a dedicated in-area badge. Add a `<span>` at the end of `.trigger-chips`:

```jsx
<span
  className="trigger-count-badge"
  style={{
    color: triggers.length >= MAX_TRIGGERS
      ? 'var(--red)'
      : triggers.length >= Math.floor(MAX_TRIGGERS * 0.8)
      ? 'var(--yellow)'
      : 'var(--green)',
  }}
>
  {triggers.length}/{MAX_TRIGGERS}
</span>
```

Color thresholds: red at cap (25), yellow at 80% (≥20), green below that.

---

### Gap 4 — Auto-resize lorebook name input
**File:** `src/components/layout/WindowHeader.jsx`

The `.lorebook-name-input` is a fixed-width `<input>`. It needs to widen as the user types and shrink when they delete.

**Fix:** Add a `ref` to the input and update its `style.width` on every change using `ch` units:

```jsx
const nameRef = useRef(null);

// initialize width once the lorebook name is loaded:
useEffect(() => {
  if (nameRef.current && activeLorebook?.name) {
    nameRef.current.style.width = Math.max(12, activeLorebook.name.length + 2) + 'ch';
  }
}, [activeLorebook?.name]);

function handleNameChange(e) {
  renameLorebook(e.target.value);
  nameRef.current.style.width = Math.max(12, e.target.value.length + 2) + 'ch';
}
```

Add `min-width: 8ch; max-width: 32ch` to `.lorebook-name-input` in `style.css` to keep it bounded in the header.

---

## File Change Summary

| File | Change type | Description |
|---|---|---|
| `src/hooks/use-drag-window.js` | Fix | Add viewport clamping in `onMove` |
| `src/components/feature/EntryCard.jsx` | Fix | Wire `collapseAll` via `useEffect`; remove derived `collapsed` |
| `src/components/feature/TypeFilterBar.jsx` | Fix | Set both `collapseAll` + `expandAll` on toggle click |
| `src/components/feature/TriggerChips.jsx` | Add | Trigger counter badge with tiered color |
| `src/components/layout/WindowHeader.jsx` | Add | `ch`-based auto-resize on lorebook name input |
| `src/style.css` | Add | `min-width`/`max-width` for `.lorebook-name-input` |

**No new files.** No new constants, services, hooks, or stores required.

---

## Implementation Order

1. `use-drag-window.js` — self-contained, no cross-file dependencies
2. `ui-store.js` (if `setCollapseAll` needs adding) → `TypeFilterBar.jsx` → `EntryCard.jsx` — coordinated 3-file change
3. `TriggerChips.jsx` — additive, no side effects
4. `WindowHeader.jsx` + `style.css` — isolated UI change

---

## Verification Checklist

After implementation, validate the Phase 2 stop condition:

- [ ] Drag window to each edge/corner — stops at viewport boundary, never goes off-screen
- [ ] Resize from each corner — minimum size (400×300) enforced, position clamps correctly
- [ ] Undo a deletion — entry reappears; redo removes it again; buttons disable when stacks are empty
- [ ] Search by trigger keyword — only matching entries visible; clear × restores all
- [ ] Toggle two type pills — only those types show; Shift+click adds to multi-select
- [ ] Manually expand 2 entries → click "Collapse All" — both collapse
- [ ] Click "Expand All" — both expand
- [ ] Drag entry #2 above entry #1 — order changes; undo restores original order
- [ ] Paste "alpha, beta, gamma" into trigger input — 3 chips appear
- [ ] Add a duplicate trigger — silently rejected, no duplicate chip
- [ ] Add triggers until near 25 — counter badge shifts yellow at 20, red at 25
- [ ] Type a long lorebook name — input widens; delete chars — input shrinks
