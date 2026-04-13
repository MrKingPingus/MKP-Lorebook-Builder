# MKP Lorebook Builder — Project Summary

> This file is for pasting into a regular Claude chat to provide project context when planning features. Last updated: 2026-04-13.

## What It Is

A browser-only web app for building AI lorebooks — structured collections of entries that give AI chatbots (like Claude, ChatGPT, etc.) contextual knowledge about characters, locations, items, and plot events in a roleplay or story setting. Each entry has a name, type, description, and trigger keywords that tell the AI when to activate that knowledge.

No accounts, no server, no installation. Everything saves automatically to the browser's local storage.

## What The User Sees

The app has one main interface: a **floating window** (dark themed, with golden corner bracket decorations) that contains everything. Inside it:

- **Header bar** — left to right: logo (book emoji + "LOREBOOK BUILDER"), editable lorebook name (desktop), hamburger menu button, close button (desktop). No minimize button — the close button returns to the landing page.
- **Lorebook switcher** — accessed via the menu dropdown under "Lorebooks"; opens a dropdown listing saved lorebooks with timestamps, inline rename (double-click), delete with confirmation, and a "+ New lorebook" button
- **Search bar** — has a mode dropdown (Search / Find-Replace / Select), a sort button (Default, A-Z, Z-A, Last Modified), a match counter, and a results dropdown with location tags. Find-Replace and Select modes swap the bar for different UIs.
- **Type filter pills** — "All" pill, one pill per entry type, a "Group by type" toggle pill, and an "Expand All / Collapse All" button (desktop only)
- **Entry cards** — the main content; desktop collapsed shows a drag handle, colored type dot, entry label (#N: name), stats badge, expand/collapse button, and remove button; expanded adds name/type fields, trigger chips, suggestions tray, and description textarea; mobile has a different compact layout
- **Hotbar** — bottom toolbar with 3 configurable action slots on the left, a central "+" button for adding a new entry, and 3 configurable action slots on the right
- **Menu panel** — opened via the hamburger button dropdown; contains three sections: Lorebooks, Import/Export, and Settings (one visible at a time)
- **Landing page** — shown when no lorebook is open; has a logo, title, tagline, "Start Building" button, template download buttons (TXT/DOCX), a "How It Works" guide, and a "Tips" section with a GitHub readme link

### Entry Types (with color coding)

- Character (purple) — people, NPCs, personas
- Location (yellow) — places, regions, buildings
- Item (blue) — objects, weapons, artifacts
- Plot Event (red) — story events, quests, arcs
- Other (teal) — anything that doesn't fit the above

## Tech Stack

- **React 18** + **Vite 7** (fast dev server with hot reload)
- **Zustand** for state management (4 small stores)
- **No backend** — all data in browser localStorage
- **Deployed** to GitHub Pages on push to main

## Project Structure

```
src/
  components/
    feature/   — main UI components (EntryCard, SearchBar, SettingsPanel, etc.)
    layout/    — window shell (FloatingWindow, Hotbar, MenuPanel, etc.)
    ui/        — small reusable pieces (Chip, CharCounter, TypeColorDot, etc.)
  hooks/       — React hooks that connect components to stores and services
  services/    — plain JS logic (import/export, autosave, find-replace, etc.)
  state/       — Zustand stores (lorebook, UI, settings, history)
  constants/   — shared values (entry types, limits, defaults, storage keys)
```

## Current Features (through Phase 7 + Polish Passes)

- Create, edit, delete, reorder entries with drag-and-drop
- 5 entry types with color-coded cards
- Trigger keywords with chips, inline editing, bulk paste, deduplication
- Trigger suggestions engine with reroll
- Trigger crosstalk detection (warns when different entries share triggers)
- Find & replace with scope selector (title, triggers, description, or all)
- Search with highlighted matches and result navigation
- Sort modes (alphabetical, last modified)
- Group entries by type
- Collapse/expand all entries
- Undo/redo (50-step history)
- Multi-lorebook support (up to 10)
- Import/export in JSON, TXT, DOCX, and ZIP formats
- Import preview before confirming
- Append import (merge entries into existing lorebook)
- Autosave (debounced 800ms)
- Phrase builder mode for composing descriptions
- Keyboard shortcuts (customizable undo/redo hotkeys)
- Entry rollback system (opt-in per-lorebook, save/restore entry snapshots)
- Per-entry limit overrides (dismiss char/trigger warnings per entry)
- Settings panel (compact triggers, counter tiers, delimiter choice, etc.)
- Mobile responsive
- Persistent window size and position

## What's Next (Phase 8 — Entry Enhancements)

Remaining work in Phase 8:
- Comparison Panel (side-by-side entry view)
- Entry duplicate detection and merge
- Entry splitting (break long entries into two)

## Known Limitations

- All data is in localStorage — clearing browser data deletes everything
- No cloud sync, no accounts, no collaboration
- Max 10 lorebooks
- 1500 character soft limit per entry description
- 25 trigger keyword soft limit per entry

## For Planning Conversations

When planning new features in a regular Claude chat, you can reference:
- **The plan** — `docs/plan.md` has the full phase-by-phase roadmap
- **The changelog** — `docs/changelog.md` has what's been done
- **Component map** — `docs/components-reference.md` maps UI elements to files
- **Architecture rules** — see CLAUDE.md in the repo root

When bringing a plan into a Claude Code session, include:
1. What feature you want (plain language)
2. Which part of the UI it affects (reference the component map if you can)
3. Any specific behavior details you decided on during planning
