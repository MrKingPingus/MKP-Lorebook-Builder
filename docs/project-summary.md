# MKP Lorebook Builder — Project Summary

> This file is for pasting into a regular Claude chat to provide project context when planning features. Last updated: 2026-04-12.

## What It Is

A browser-only web app for building AI lorebooks — structured collections of entries that give AI chatbots (like Claude, ChatGPT, etc.) contextual knowledge about characters, locations, items, and plot events in a roleplay or story setting. Each entry has a name, type, description, and trigger keywords that tell the AI when to activate that knowledge.

No accounts, no server, no installation. Everything saves automatically to the browser's local storage.

## What The User Sees

The app has one main interface: a **floating window** (dark themed, with golden corner decorations) that contains everything. Inside it:

- **Header bar** — shows the lorebook name, a hamburger menu button, and minimize/close buttons
- **Lorebook tabs** — switch between up to 10 lorebooks
- **Search bar** — filter entries by name, triggers, or description text
- **Type filter pills** — filter by entry type (Character, Location, Item, Plot Event, Other)
- **Entry cards** — the main content; each card shows an entry's name, type badge, and trigger chips when collapsed; expands to show the full description textarea, trigger editing, suggestions, and settings
- **Hotbar** — bottom toolbar with quick-action buttons (add entry, undo, redo, bulk select, find & replace, etc.)
- **Menu panel** — slides out from the hamburger button; contains Import, Export, and Settings sections
- **Landing page** — shown when no lorebook is open; explains the app and links to the README

### Entry Types (with color coding)

- Character (teal) — people, NPCs, personas
- Location (blue) — places, regions, buildings
- Item (amber/gold) — objects, weapons, artifacts
- Plot Event (purple) — story events, quests, arcs
- Other (gray) — anything that doesn't fit the above

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
