# MKP Lorebook Builder — Implementation Plan

---

## Project Overview

MKP Lorebook Builder is a browser-only SPA for authoring AI lorebooks — structured collections of named entries with triggers, types, and descriptions that activate contextual information in LLM sessions. No backend, no accounts, no installation. All state lives in localStorage.

---

## Current State

All planned phases through **Phase 10** have shipped (see **Completed** below). Day-to-day work now falls into three buckets:

- **Bugs & small adjustments** are tracked as **GitHub Issues** (`bug` / `enhancement` labels), not in this file. The former in-plan _Known Bugs_ and _Queued Adjustments_ lists were migrated there.
- **Larger unbuilt ideas** live under **Future Features** below — documented to preserve intent and surface dependencies, not committed to a phase.
- **Open / deferred TODOs** from otherwise-shipped phases are listed here so they aren't lost.

### Open / deferred

- **Verify hand-made JSON import** (follow-up to #102) — a reporter noted hand-made JSONs "wouldn't import," most likely malformed JSON (trailing commas / comments / smart quotes) rather than a schema issue. Needs the reporter's actual file to reproduce.
- **Entry-list keyboard navigation** (deferred from 10D) — a roving focus cursor + list ARIA so keyboard/screen-reader users can move through and act on entries. Also unblocks per-entry hotkeys (duplicate / delete / toggle *this* entry) if ever wanted. A feature in its own right.
- **Entry Planner** (parked from Phase 9) — see Future Features.
- **Mobile crosstalk redesign** (parked from Phase 9) — see Future Features.

---

## Upcoming Phases

Pre-planned but not yet started (unlike Future Features, these have locked design decisions and are queued to build). Both came out of the 2026-07-24 "what's next" user-poll planning pass; Folders is the poll front-runner, Templates the runner-up, sequenced so Templates can reuse Folders' category primitive.

### Phase 11 — Custom Categories / Folders (GitHub #116)

Builder-only organization layer — Reaper-style nested, collapsible, colored folders that entries live inside. **Separate from EntryType and never exported.**

**Locked decisions (2026-07-24):**
1. **Model A** — the flat `entries[]` array stays the single source of truth for order; folders are a render-time grouping layer (mirrors how `group-by-type` injects headers over a flat array in `EntryList.jsx`). Keeps export / autosave / history untouched. `lorebook.folders = [{ id, name, color, parentId, collapseState, order }]`; `entry.folderId = null`. Export is free (JSON export whitelists CharSnap fields, so folder data drops out); render treats an unknown `folderId` as top-level so a history undo can never orphan an entry.
2. **Type-groups nest _inside_ folders** — render walk is folder (outer) → optional type sub-header (inner) → entries.
3. **Three collapse states per folder** — `full` (entries normal size, indented), `condensed` (entries shrunk to name + a couple of buttons — needs a genuine compact `EntryCard` variant), `tucked` (entries hidden, header shows a count).
4. **Assignment is menu/bulk first, drag deferred** — Select-mode bulk "Move to folder…" **and** a per-entry "Move to folder" button in the card footer (to the right of the `rollback-toggle-btn`); drag-into-folder comes last.
5. **Colors: curated theme-safe swatch set now, custom hex later.**
6. **Filter-by-folder = a `Folder ▾` dropdown/sheet** (parallels the type filter); new filter dimension in `ui-store`.
7. **Search-in-folders:** empty folders hide during an active search; a match force-renders even inside a tucked/condensed folder.
8. **Undoability:** structural ops (create/delete/move-entry) snapshot to history; collapse toggles don't.
9. **Desktop-first; mobile folders are a separate deferred design.**

**Sub-phases:** ~~11A foundation (data model, folder CRUD, bulk + per-entry assignment, full + tucked states)~~ **shipped 2026-07-25** · ~~11B condensed compact-card variant~~ **shipped 2026-07-26** · ~~11C nesting + type-in-folder + collapse-all~~ **shipped 2026-07-26** · ~~11D search/filter-by-folder + sort reconciliation~~ **shipped 2026-07-27** · ~~11DD modifier+click selection macros~~ **shipped 2026-07-27** · 11E drag-and-drop (highest risk: two-part `folderId`-write + `entries[]`-splice on a drag). Complexity: 11D Medium · 11E High.

**Decisions taken during 11DD (2026-07-27) — modifier+click selection macros:**
34. **Shift adds, ctrl/cmd removes; shift with either does it to a range.** This deliberately diverges from the OS file-manager convention, where a plain click *replaces* the selection and shift+click replacing-with-a-range follows from that. Here a plain click already toggles like a checkbox, so replace-semantics on shift+click would make the most reachable gesture silently discard a selection the user was building. `metaKey` counts as `ctrlKey` — a real ctrl+click on macOS opens the context menu.
35. **Only shift+click opens select mode.** Ctrl+click needs an existing selection to subtract from, so outside select mode it is a no-op rather than a mode change that does nothing visible. Macros stay disarmed in `find-replace` mode entirely, so a stray shift+click can't yank the user out of a replace.
36. **Macros are header-only, on the capture phase.** An expanded card's body is a live editor and shift+click inside a textarea is a real text-selection gesture. Capture phase (rather than bubbling) means a macro click never reaches the Expand / Remove / rename / collapse buttons sitting *inside* the header — bubbling would let those fire first.
37. **`orderedIds` comes from `flattenRenderItems`, so a range spans entries hidden inside a tucked folder.** They really do sit between the two endpoints, and excluding them would make a range mean something different depending on what happened to be collapsed. The folder header shows a `N selected` badge while tucked so the hidden members of a selection are never invisible.
38. **Every macro re-anchors on its target**, including plain `toggleSelected`, so a run of shift+clicks walks outward from the last thing acted on rather than from a long-forgotten first click. A missing anchor — filtered away, deleted, or from the other crosstalk pane — degrades to a single-entry range.
39. **Multi-entry drag stays in 11E**, not here. The drag rewrite needs multi-id moves, folder drop targets with the `folderId` write, a drop indicator, and a condensed-row decision — one coherent job on a system that is currently subtly broken. Building multi-drag on today's drag would mean writing it twice. 11E consumes 11DD's selection.
40. **Mobile keeps tap-to-toggle** — there are no modifier keys, and a long-press "select up to here" is a separate design.

**Decisions taken during 11D (2026-07-27):**
27. **The folder filter is active-book only.** Type ids are shared vocabulary across every lorebook, so the type filter safely applies to both crosstalk panes; folder ids are per-book, so the same treatment would *blank* the reference pane rather than narrow it. `useDisplayEntries` takes `{ isReference }` and skips the folder filter there. This is the fourth instance of the same one-book/two-book mismatch logged in the crosstalk review.
28. **The selection is pruned against the live folder list on every read** (`pruneFolderFilter`). A deleted folder — or a crosstalk role swap that makes the filtered book the *reference* — leaves the filter naming ids that no longer exist, and an unpruned filter would silently show an empty list with no obvious way back. Pruning degrades it to "no filter" instead. An empty pruned selection always means *show everything*, never *show nothing*.
29. **Selecting a folder selects its whole subtree.** With nesting shipped, a filter that ignored descendants would be least useful exactly where organization matters most. `folderFilterEntryIds` unions subtrees, so parent + child selected together can't double-count.
30. **A folder filter behaves like a search inside the render walk** — empty folders drop out and tucked folders force open (`narrowed = searchActive || filterActive`). A tucked folder under a filter would otherwise hide the very entries the filter was asked to surface.
31. **Alpha sorts order folder rows by folder name** (`folderOrderFor` → `buildRenderItems({ orderBy })`). Anchoring reads member position, which is right for manual order and for `last-modified` (a folder lands where its most recently touched member landed) but visibly wrong under alpha: a folder named "Zeta" holding an entry named "Apple" anchored *above* a loose "Beta". Folder and entry rows now sort in one alphabetical stream, so the column reads A→Z whatever a given row is. Under name ordering an empty folder takes its alphabetical place rather than leading — decision 13's "newest first" rule only exists because an empty folder has no member to anchor to.
32. **The filter survives the folder-suppressing sorts.** The cross-match modes hide folder *rendering*, but the filter is an entry-level predicate that still means something without headers, so it stays live and yields a flat list of that folder's entries still partitioned by match.
33. **`Folder ▾` renders only once the book has folders.** The desktop filter row already carries ten controls; a user who never made a folder gains no chrome. On mobile the rows fold into the existing `Filter ▾` popover, so the small screen gains the feature without gaining a button.

**Decisions taken during 11C (2026-07-26):**
20. **Depth capped at 3** (`MAX_FOLDER_DEPTH`). Each level costs 21px of indent and a crosstalk pane is only ~360px wide; at depth 8 a condensed row has ~46px left for the name. Three covers the Reaper master → group → contents shape from #116 with room.
21. **A folder anchors at the earliest display position anywhere in its subtree.** The 11A rule (anchor at first member) breaks under nesting, because a parent can hold no entries of its own — only child folders — and so has no position in `entries[]`. This is the minimal extension that keeps Model A intact.
22. **Nesting re-gathers both trees in `entries[]`** (`setFolderParent` → `gatherSubtree`), extending decision 10 from a folder's members to a whole subtree. `gatherSubtree`'s `anchorIgnoring` makes the moved folder travel *to* its destination rather than dragging the destination up to itself — same direction as filing entries.
23. **Collapse inherits by severity, never by writing.** A child renders at the more collapsed of its own state and its ancestor's (`effectiveCollapseState`), so a condensed parent compacts its subtree while each child keeps whatever it had set. Opening the parent restores those choices.
24. **Deleting a folder promotes its children to the deleted folder's parent**, not to the top level — so removing a middle folder leaves its children inside the grandparent. Reduces to "top level" for a top-level folder, which is what 11A's note meant.
25. **`buildRenderItems` returns a tree**, not a flat list: `{ kind:'folder', folder, depth, count, totalCount, children }`. The header shows `totalCount` (the whole subtree), since that's what tucking hides. `flattenRenderItems` gives a flat view where one is needed.
26. **Collapse Folders is a two-state global toggle** (tuck all / open all), shown only when folders exist and hidden while a cross-match sort suppresses folders.

**11C polish (2026-07-26, from user testing):** the nest menu can create the parent it needs (`createFolderAsParentOf`, gated on the subtree still fitting under the cap); empty folders now **lead** their level newest-first rather than trailing it, reversing decision 13's placement so a folder you just made is the topmost thing on screen; and Settings gained a **Folders** section with `folderCollapseStages` (three-stage vs two-stage, dropping `condensed`) and `condensedShowStats`. The stages setting is render-only — `clampCollapseState` shows a state the active cycle doesn't offer at the nearest less-collapsed one it does, so switching never rewrites stored folder state and switching back restores it.

**Decisions taken during 11B (2026-07-26):**
15. **Condensed is a `density` prop on `EntryCard`, not a separate component.** `EntryCard` already branches on collapsed/expanded, mobile/desktop, compare, and reference-mirror; a standalone compact card would have had to re-implement select mode, crosstalk badges, health, and rollback, and the two copies would drift.
16. **Condensed row = type dot + `#N: Name` + `Expand` + `Remove`.** Drag handle, stats badge, and status badges (Public / Hidden / crosstalk) all drop — they're one Expand away. `Remove` stays by explicit user call, on the grounds that a condensed folder is where you scan and prune. ~26px against the 40px default, and the row ignores the global `entryHeaderSize` preference (that setting asks for roomier rows everywhere; condensing asks for tighter ones here).
17. **Density is header-only, and only while shut.** Expanding a condensed card restores its full chrome for as long as it's open, so an expanded card is never a half-sized hybrid. Entering condensed force-collapses a card the user had open; leaving condensed doesn't re-open anything.
18. **A condensed row can't start a drag** — it has no handle to grab. 11E will need to decide whether condensed rows are drag targets.
19. **Search doesn't override condensed** (unlike tucked, which force-opens). A condensed row still shows the entry name, so a match is findable; a tucked folder shows nothing at all.

**Decisions taken during 11A (2026-07-25):**
10. **Filing an entry repositions it in `entries[]`** so a folder's members stay contiguous (`assignEntriesToFolder`). Chosen over pure-visual grouping specifically to give 11E a real array index to drop into — display-order and array-order agree, so a drop position maps to a splice. Note this means filing entries *does* change export numbering (sort/group modes still don't — they never write the array).
11. **History snapshots widened to `{ entries, folders }`** for folder ops. `use-undo-redo` only writes folders back when the snapshot carried them, so the ~10 existing entries-only `pushSnapshot` call sites are unaffected. Rename/recolour snapshot too (one step per edit session, committed on blur/Enter); collapse never does, per decision 8.
12. **Reorder is by entry id, not list position** (`reorderEntriesById`). This also fixed a live bug: `EntryList` passed *display* indices into an `entries[]` splice, so dragging under an active search or `group-by-type` reordered two unrelated entries.
13. ~~**Empty folders trail the list** ordered by `order`~~ **reversed in 11C polish — they lead, newest first.** Original reasoning — they have no member to anchor to, and a freshly created folder has to be visible somewhere. They hide while a search is active (decision 7's empty-folder half, taken early since 11A would otherwise render obvious noise).
14. **Type sub-headers stay top-level-only in 11A** — `groupByType` heads the loose-entry stream and resets after each folder block. Type-inside-folder is 11C, per decision 2.

**Folders × crosstalk (reviewed 2026-07-25).** Folders are a one-book feature and crosstalk is a two-book mode; that mismatch surfaced in six places. Resolved: cross-book clones drop `folderId` (`cloneEntry`, same reasoning that already zeroes `snapshots`); the cross-match sorts suppress folder rendering the way they already suppress `group-by-type`, with the folder controls disabled and explained while suppressed (`constants/sort-modes.js`); reference-side selections can't reach the folder bulk ops (they used to be able to mint a stray empty folder in the active book).

**Deferred — folders don't render on the reference side.** `ReferencePanel` has its own read-only card renderer and never touches `EntryList`, so a book shows its folders when active and a flat list when referenced; swapping roles makes the structure appear/vanish. Accepted for now — the reference panel is deliberately a reduced mirror, and a read-only folder walk there is real work sitting across 11B/11C. Revisit once nesting (11C) exists, since that's when a flattened reference view loses the most. Related, unaddressed: `＋ Folder` sits in the shared `GlobalFilterBar` above both panes with no cue that it acts on the active book.

**Polish pass (2026-07-25, from user testing).** Filing clears the selection (folder moves are batch-complete actions, unlike the chainable type/visibility ops — matches `copyToOtherPanel`); the collapse control became a real 24px hit target; the swatch palette moved to pastels, deliberately apart from `ENTRY_TYPES`, with the folder colour now used for fills only since a pastel can't carry label text on the light theme; every folder-creation path opens the rename input focused and pre-selected via a new `pendingFocusFolderId` (mirrors `pendingFocusEntryId`). Decision 7's second half also landed here — a tucked folder force-opens while a search is running, since a search that can't surface filed entries reads as broken.

**Open from 11A:**
- **Drag has no folder semantics yet.** Dragging a card in or out of a folder block reorders `entries[]` but doesn't rewrite `folderId`, so the card snaps back to its folder visually. Expected — assignment is menu/bulk-first by decision 4 — but it's the first thing 11E has to close.
- **Entry-card footer is at four controls** (Entry History · Move to folder · Public/Private · Hide from Export). Fits one line at the desktop default; wraps in a narrow crosstalk pane. The footer-crowding revisit below is now live, not theoretical.

### Phase 12 — Entry Templates (GitHub #114)

Save an entry's content as a reusable, **globally-stored** template and load it into a new or existing entry. Sequenced after Phase 11 to reuse its category primitive.

**Locked decisions (2026-07-24):**
1. **Payload = the whole entry, always** — no save-time field menu; a user who doesn't want a title/triggers just leaves them off the source entry.
2. **Two load actions:** "Fill current entry" and "Create new entry from template".
3. **Content-driven checklist:** load shows a field checklist listing only the fields the template has content in; a description-only template loads straight in with no checklist.
4. **Description conflict on fill-current:** ask (overwrite vs append at cursor).
5. **Triggers captured literally** (good for `name / alias / nickname` scaffolds).
6. **Global `mkp_templates` localStorage key** (via `storage-service.js`); new `templates-store` + `use-templates`.
7. **Bookmarks-style drill-in folder dropdown** (navigate-in + breadcrumb) with colors + per-template hover preview — visually distinct from Phase 11's inline-indented folders by design; shares only the pure tree helper + data shape (`services/category-tree.js` if extracted), not components or stores. Extraction finalized once Phase 11 exists.
8. **Management = both:** quick actions in the Load dropdown's manage mode **plus** a full Settings → Templates section.
9. **Button placement:** Save-as-Template + Load-Template both in the entry-card footer **for now** — flagged for revisit (see note below).

**Sub-phases:** 12A core (save whole entry, both load actions, content-driven checklist + description-conflict prompt, flat list) · 12B organization (drill-in folders, colors, hover preview, management). Complexity: 12A Medium · 12B Medium.

> **Revisit — entry-card footer crowding.** Phase 11 adds "Move to folder" and Phase 12 adds "Save as Template" + "Load Template" on top of the existing entry-history / visibility / public controls. Before it overflows, rethink the footer — an overflow `⋯` menu, relocating the less-common actions, or regrouping per-entry actions. _(what would FabFilter do?)_ Noted 2026-07-24.

---

## Future Features

Not assigned to a phase. Documented to preserve intent and surface dependencies so implementation decisions can be made when the time is right.

**Entry Planner (parked from Phase 9)**
Dedicated panel for notes and planned entry stubs, separate from the build panel; convert a planner note into a blank entry shell; a build-page filter to show only unfilled stubs. Deprioritized 2026-07-19 — a fun feature, but it keeps sliding down the list behind core functionality. The smart-assistance extension (proper-noun scanning via `scan-service.js`) is catalogued separately below.

**Entry Planner Smart Assistance**
Extends the basic Entry Planner with proper-noun scanning via `scan-service.js` — detects names mentioned in planner notes that don't have existing entries and prompts the user to create them. Depends on: the Entry Planner being built.

**Mobile crosstalk redesign (parked from Phase 9)**
Replaces the broken side-by-side layout on mobile with an overlay/annotation model. Anchor never moves without explicit gesture; reference content surfaces as inline annotations on active entries and one-deep peek overlays. Multi-select pull uses a temporary "pose" against the existing Select mode. Full plan and phasing in `docs/mobile-crosstalk-plan.md`.

**Icon / Symbol Library (replace emoji + text glyphs)**
Adopt a proper icon set (inline SVG sprite or a lightweight browser-only icon package) for UI affordances currently drawn with emoji or bare text characters — the FAB `+`, hotbar action icons, the 📌/⬇/⎘/↕ glyphs, etc. Motivations: consistent cross-platform rendering (emoji look different per-OS and don't inherit `currentColor`), crisper scaling, cleaner theming. _First step already taken 2026-07-23: the header bug/feature icons are inline SVG (`FeedbackLinks.jsx`)._ Scope to decide when picked up: which approach fits the layer rules and bundle budget, how icons are referenced from constants, and a migration order.

**Shift+Scroll on config dropdowns (follow-up)**
The reusable `components/ui/CyclingSelect.jsx` (shipped 2026-07-22) added Shift+scroll cycling to the content dropdowns (type, delimiter, search-mode) and the sort control. The remaining Settings/config selects (theme, storage profile, entry header height, window layout) were intentionally left on plain `<select>` — rarely-touched config, but adopting `CyclingSelect` there is a mechanical swap if wanted.

**Lorebook JSON Metadata Portability (`_meta`)**
Add `createdAt` / `lastModified` timestamps to lorebook objects. Export: optional "Include metadata" checkbox appends a `_meta` block (timestamps + settings snapshot). Import: detect `_meta` and prompt to apply or skip the saved settings. Touches `json-export.js`, `json-import.js`, lorebook creation, `autosave.js`.

**In-App Help Menu / Documentation Panel**
A dedicated help section (button or settings tab) with usage guidance, tips, and feature explanations. Nothing technically blocks it, but content needs writing first. Deferred until feedback clarifies what users actually need surfaced in-app.

**Lookup Table Trigger System**
A categorised, genre-separated reference table for trigger suggestions — separate from the live suggestion engine. Users browse/filter a curated list by type or genre and add directly. Substantial standalone feature; benefits from the suggestion-engine architecture being stable first.

**Category-Weighted Suggestion Variants**
`suggestion-engine.js` applies different weights and candidate pools per entry type, so suggestions for a character differ from those for a location. Needs a per-type lookup table / seed word list to have real impact. Depends on a lookup-table approach being designed.

**Thesaurus Trigger Suggestions — Follow-ups**
Follow-up status (data-quality safety nets on top of `dictionaryapi.dev`):
1. ✅ **Datamuse `ml=` backup + on-demand "Related terms"** — _shipped 2026-07-25._ Datamuse means-like results power a looser "related" set, reached two ways: (a) **auto**, empty-only, when the dictionary + lemma fallback return nothing (no latency on the common path); (b) **on demand**, via a **＋ Related terms** button in the popover that lazily fetches and appends related senses to the ◀ ▶ cycle even when the word already has (possibly sparse) dictionary synonyms — supersedes the earlier "thin-or-empty auto-append" idea (a button is better: user-controlled, no cost until asked). Related words are **organised**: `md=p,f` tags each result, so they're **grouped into per-part-of-speech senses** (`related · nouns / verbs / …`) and **frequency-trimmed** to drop rare/obscure noise. Best-effort throughout; `fetchRelated` reports an error channel so the button can retry. Tradeoff stands: `ml=` is looser than curated synonyms. **Possible later layer:** distinct Datamuse relationship buckets (`rel_syn` / `rel_spc` "more general" / `rel_gen` "kinds of" / `rel_ant` opposites) as separately-labelled senses for even sharper organisation — noted while shipping the PoS grouping, not yet built.
2. **Bundle a frequency-filtered local thesaurus** — removes the network dependency and gives data-quality control, at a ~1MB+ bundle hit (measured 2026-07-25: the whole app is only ~144 KB gzipped, so this would be ~5× the entire bundle). Only justified if API coverage stays poor after the Datamuse backup; the user wants to revisit it deliberately when the time comes.
3. ✅ **Surface the resolved lemma in the header** — _shipped 2026-07-25._ When an inflection fallback resolves to a different base form, the popover header reads `Synonyms for "lives" (via "life")`. `fetchSynonyms` returns `resolved`, `use-thesaurus` threads + caches it, `ThesaurusPopover` shows the muted "(via …)" only when the lemma differs from what was hovered.

Won't revisit unless something changes: per-PoS-vs-per-sense granularity (the API only populates meaning-level synonyms) and archaic synonyms ("sith" for "because") — filtering the latter needs a bundle-heavy frequency dictionary.

**Lorebook Crosstalk — Second Window Mode**
For power users comparing large lorebooks, a second floating window may beat the current panel-within-window approach. Depends on Phase 9 crosstalk being fully stable. Significant UI complexity — z-index management between two draggable windows.

**Lorebook self-reference**
Intra-book entry-vs-entry consistency analysis — an adaptation of crosstalk against a single book. Scope (reuse the crosstalk pipeline vs. a new field-level diff) to be decided when picked up.

**All-Conflicts Panel**
Aggregate view of every trigger overlap across the active lorebook in one place (current crosstalk surfaces conflicts per-entry). Lists each conflicting trigger with the entries that share it, plus batch Allow/Revoke at the lorebook level. Phase 9 crosstalk may subsume parts of this.

**Entry History — inline quick actions + Settings management**
Apply the Phase 12 Templates management pattern to the Entry History (rollback/snapshot) system: quick per-snapshot actions inline where history is used, plus a fuller management surface in Settings — the same "quick actions where you are + full management in Settings" split. Noted 2026-07-24 while planning Entry Templates; the pattern fits history cleanly. Scope to define when picked up.

**Entry Splitting**
Optional system for breaking a long entry into two when it exceeds a length threshold: split detection + suggested split points; a split action (the second entry inherits triggers + a name suffix); a linear/non-linear prompt (linear splits inject a bridging prefix); a split-pair badge; and a temporary `CHAR_LIMIT` override until the split is confirmed. Deferred — per-entry limit overrides are sufficient for now.

**Hover Peek on Collapsed Entries**
Hovering a collapsed card reveals a temporary preview (name/type/triggers/description summary) without expanding it, so users can skim a long book. Non-trivial to implement without interfering with drag-to-reorder and existing hover states.

**Mass Move / Bulk Reorder**
Multi-select entries and move them together up/down. Options: checkbox column + bulk move, shift-click range, or drag-group. No design decision yet; single-entry drag is sufficient for current book sizes.

**Markdown Dropdown**
Helper UI on the description textarea for inserting common markdown (bold, italic, heading, bullet, blockquote); insertion at cursor, no parser. Deferred because the target platform doesn't currently render markdown in descriptions.

**Mobile Density Pass**
The mobile UI burns ~half the viewport on chrome before any entries show (header, search/sort row, type-filter chips, lorebook-name row, reference row, hotbar footer ≈ 490px). Ideas, ranked by ROI:
- Collapse top chrome into a sticky compact bar on scroll (name/reference/filters fold into a thin row with the entry count + a chevron). Recovers ~250px.
- Replace the chip-row type filter with a `Filter ▾ (n)` button opening a sheet. Recovers ~75–100px.
- Drop the visible `LOREBOOK NAME` / `REFERENCE` labels for placeholders + small icons. Recovers ~30–50px.
- Combine the name + reference rows when crosstalk is on.
- Auto-hide the name row on scroll; tap the header title to reveal.

User wants mockups before committing to a direction. Defer until after the mobile crosstalk redesign.

---

## Completed

All planned features through Phase 10 are implemented. Summary of what was built (full detail lives in git history and `CHANGELOG.md`):

### Phases 1–8 + early polish passes
- **Phase 1 — MVP:** localStorage persistence, autosave, floating window shell, entry cards (name/type/description/triggers), JSON export.
- **Phase 2 — Functional Baseline:** draggable/resizable window with viewport clamping, undo/redo, drag-to-reorder, collapse/expand, live search, type filter, char/trigger counters, duplicate prevention, bulk paste.
- **Phase 3 — Feature Complete:** find & replace with dedup, search highlight, group-by-type, inline chip editing, compact trigger mode, suggestions engine (tray/reroll/add), full import/export (JSON/TXT/DOCX/ZIP), import preview, multi-lorebook navigation, settings panel, keyboard shortcuts, lander.
- **Phase 4 — Polish & Hardening:** description highlight overlay, Enter-key scroll-to-first-match, Shift+scroll type cycling.
- **Phase 5 — Phrase Builder:** phrase builder mode, pill row with drag reorder, confirm/cancel.
- **Phase 6 — Search & Sort:** sort modes (alpha-asc/desc, last-modified), `lastModified` on entries, window size/position persistence, search results dropdown with location tags, Enter-key match navigation.
- **Phase 7 — Trigger Enhancements:** 6 delimiter options wired to settings, `scan-service.js` scanner, trigger crosstalk detection (yellow/blue chip rings + hover popover), Allow/Revoke acknowledgment, `lorebook.allowedOverlaps` persistence.
- **Phase 8 — Entry Enhancements:** entry health evaluator, per-entry limit overrides (blue border), opt-in rollback with snapshots, navigate-away save prompt, in-card snapshot preview + restore.
- **Polish Passes 1–4:** export header, F&R inline layout + scope selector, mobile dropdown/menu fixes, counter color corrections, hotkey customization, new-entry auto-focus, search↔F&R text transfer, X-to-lander, inline lorebook rename + name modal, inline delete confirm, tiered description/trigger borders, capitalized-trigger casing, backslash-artifact import fix, copy-to-clipboard templates, Allow-All-Overlap batch, Hide-from-Export with marker + popover, export filename override.

### Phase 9 — Global Features (crosstalk)
Active + reference model (chosen over a retracted dual-editor prototype that caused autosave clobber and store-sharing issues): `referenceLorebookId` on `lorebook-store`; read-only `ReferencePanel`; swap-on-edit-click; global search/filter/sort above the pane split; lateral find & replace (per-side Apply); `diff-service.js` (word-level LCS); cross-pane "in both ↗ / differs ⚖ / comparing ✎" badges; side-by-side compare mode with live diff annotations and `getClientRects()` outline overlays; cross-match sort modes; `crosstalkSwapMode` setting; rollback diff highlighting; Settings accordion reorganisation. Entry Planner and mobile-crosstalk redesign parked → Future Features.

### Polish Pass 5 — UI Refinements
Rollback→Entry History rename; Skip-really-skips; settings-panel scroll fix; native description spellcheck; CHANGELOG bootstrap; Select-mode upgrades (persisted selection, per-row staged type changes, Escape-exits); import-flow segmented modes + first-run placeholder discard; lander overhaul (recent books, start tiles, Learn + What's-New panels, report-a-bug link); FAB quick-add menu; thesaurus on attached triggers (Replace / Add-Similar).

### Workflow Overhaul (initiative)
Ongoing friction-sanding pass. Shipped: **Export hotbar action** (`make_export` + floating `ExportMenu`) and the **Add-to-hotbar quick action** from the redesigned horizontal FAB quick-menu (+ new default hotbar layout). New friction points get logged and graduate into work when picked up.

### Phase 10 — CharSnap Parity, Export Control, Themes & Accessibility
- **10A — CharSnap JSON parity (#102):** import reads `entryType`; export emits the CharSnap shape (keyed-object entries, `entryType` labels, `isPublic`); private-by-default; per-entry Public toggle; All Public / All Private hotbar actions; template uses the CharSnap exporter.
- **10B — Bulk Export Visibility:** folded into Select mode — `Set Visibility ▾` (Hidden/Shown) and `Set Public/Private ▾` expanders in `BulkActionBar`, one undoable step each; per-card Hide button retained.
- **10C-pre — Hotkey engine overhaul:** registry-driven engine (`constants/keybindings.js`, `services/keychord.js`); dispatch table; full capture-based rebinding; Escape priority stack (`services/dismiss-stack.js`); `?` cheat-sheet overlay; 13 wired actions.
- **10C — Color themes:** `data-theme` mechanism applied pre-render; light + high-contrast token blocks; custom theme editor (7 pickers, `color-mix`-derived rest, live WCAG readout); System theme following the OS.
- **10D — Accessibility:** Settings → Accessibility section; text-only UI scale (px→rem + `--ui-scale`); reduced motion (toggle + `prefers-reduced-motion`); high-contrast toggle; global `:focus-visible` ring; targeted ARIA labels; Hotkeys relocated here.

### Bug fixes & QoL pass (2026-07-22 → 07-23)
Expand-All→single-collapse bug (#112, pulse-based); removed the dead "full type button grid" setting (#98); Shift+scroll on content dropdowns via `CyclingSelect`; advisory entry-title length counter; entry header-height setting; lorebook-switch "Switch ▾" discoverability; lander "Import File" opens the picker and imports directly (no prompts/name-modal); hotbar Import rename + arrow; header bug/feature SVG icons (#113 item 3); centered lorebook-name input; enlarged/uniform header icons.

### Infrastructure
- **Storage usage ring** (`WindowHeader`) — total localStorage usage vs a fixed per-engine cap; hover summary + click detail popover with a five-category breakdown; write-driven recompute via a `storage-service.js` pub-sub.
- **Storage compression + quota correction** — `lz-string` (`compressToUTF16`) on every write with an `LZ1:` prefix; legacy plain-JSON values still read and re-save compressed (no migration). Fixed the inflated `navigator.storage.estimate()` quota → fixed cap; `MAX_LOREBOOKS` 10 → 50.
- **Browser-aware quota profile** — `storageQuotaProfile` (5 MB WebKit / 10 MB Chromium-Gecko), UA-detected on first boot and overridable in Settings and the ring's detail popover.
