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

Phases with locked design decisions, as opposed to Future Features which are still ideas. Some have since shipped and stay here with their decisions intact — status is marked inline on each phase's sub-phase line, not by which section it sits in. As of 2026-07-31: **11 complete**, **12 not started**, **13 complete**. Both came out of the 2026-07-24 "what's next" user-poll planning pass; Folders is the poll front-runner, Templates the runner-up, sequenced so Templates can reuse Folders' category primitive.

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

**Sub-phases:** ~~11A foundation (data model, folder CRUD, bulk + per-entry assignment, full + tucked states)~~ **shipped 2026-07-25** · ~~11B condensed compact-card variant~~ **shipped 2026-07-26** · ~~11C nesting + type-in-folder + collapse-all~~ **shipped 2026-07-26** · ~~11D search/filter-by-folder + sort reconciliation~~ **shipped 2026-07-27** · ~~11DD modifier+click selection macros~~ **shipped 2026-07-27** · ~~11E drag-and-drop~~ **shipped 2026-07-27**. **Phase 11 complete.**

**Phase 11 polish (2026-07-27, from user testing):** spring-opened folders are now restored on drop unless the drop landed in them (`sprungOpen` in `use-entry-drag`), so a folder opened merely in passing doesn't stay open; `＋` on a folder header adds an entry already filed there (`addEntryInFolder`, routed through `assignEntriesToFolder` so it lands in the folder's run rather than at the end of `entries[]`); `select_all_visible` (Alt+V) and `deselect_all` (Alt+D) joined the keybinding registry, serviced in `GlobalFilterBar` because it is the only component holding the visible-id list for both panes; and the collapse-stage setting became a checkbox set (`normalizeCollapseStages`) defaulting to **open-or-shut**, with `full` always on and one other stage required.

Two things worth remembering from that pass. **`Mod` in this codebase means Ctrl/Cmd, not Alt** — `Mod+V` is Paste, and a request for "Mod+V" should be read as an ambiguity to resolve, not a collision to engineer around. And **`clampCollapseState` was only half-wired**: `FolderHeader` clamped its glyph but `EntryList` rendered from the raw stored state, so a folder saved as condensed kept rendering condensed after that stage was switched off. Latent since 11C, and missed because the old scenario always returned the folder to full before switching the setting.

**Folder reordering (2026-07-27).** Dropping a folder on the top ~35% of another folder's header (`FOLDER_BEFORE`, `moveFolderBeforeFolder`) makes it that folder's sibling, immediately before it. Nothing else can express folder order: every row around a folder belongs to some folder, so an entry-row drop always resolves as "join that folder".

This was first built as a drop zone above the list, mirroring the tail. That does not work, and the reason generalises: **a drop target must never resize the list.** The zone went 0→46px when a drag began, which shifted every row down under the cursor, and the resulting scroll-geometry change desynchronised the test harness's drag manager so the *next* drag hung. The tail zone gets away with growing only because it sits below everything. Anything above the content has to be a paint-only affordance — hence a band on the header drawn with a pseudo-element.

Still open: there is no "after this folder" band, so ordering is expressed purely as "before X". Reaching an arbitrary permutation can take more than one drag.

**Decisions taken during 11E (2026-07-27) — drag and drop:**
41. **A drop position implies the parent.** Between two rows inside a folder joins that folder; between two top-level rows leaves every folder; onto a folder header files into it; past the end of the list unfiles. One rule covers reordering and re-filing, which is what lets a drag write order and `folderId` as a single undoable step.
42. **Swap-on-hover replaced with an indicator that commits on release.** The old model couldn't express "into folder F" — no array swap means "change this row's parent" — and it pushed **one history snapshot per row dragged past**, so undoing one gesture took a dozen Ctrl+Z presses and evicted a dozen slots from a 50-deep stack. Both bugs closed together. A drop that lands where it started is detected (`isNoopEntryDrop`) and costs no history step at all.
43. **A header drop reuses `assignEntriesToFolder`**, so dragging onto a folder and picking it from the Move-to-folder menu put the entries in exactly the same place. It appends to the folder's existing members rather than leading them.
44. **The drag handle now renders in select mode.** A selection only exists there, so hiding the handle made multi-entry drag unreachable — the feature was impossible as specified until this changed. Clicking a row still toggles selection; only the handle starts a drag.
45. **The folder *header* is the folder's drag source, not the folder block.** Making the block draggable nests every entry row inside a draggable ancestor, which stalls the browser's drag session — **no entry inside any folder could be dragged at all**. Found only because the harness hung on it.
46. **`dragend` and `drop` must reach the document.** Calling `stopPropagation()` on them breaks anything tracking the end of a gesture from above, including this hook's own window-level backstop for drags released outside the list.
47. **Auto-scroll stops when the container is already at its limit.** Otherwise the rAF loop respins every frame for the whole drag — and forever, if a drag is abandoned where `dragend` never fires — saturating the main thread for nothing.
48. **The area below the last row is the drop target, not just the tail element.** Auto-scroll slides the tail up past the pointer as it makes room, so the tail alone is unreachable at the moment you aim for it. The container claims anything at or past the tail's top edge; rows and headers `stopPropagation` on dragover so it only ever sees unclaimed space.

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
- ~~**Drag has no folder semantics yet.**~~ **Closed in 11E** — a drop position now decides the folder, and the whole gesture is one undo.
- **Entry-card footer is at four controls** (Entry History · Move to folder · Public/Private · Hide from Export). Fits one line at the desktop default; wraps in a narrow crosstalk pane. The footer-crowding revisit below is now live, not theoretical.

### Phase 13 — UI/UX Overhaul (status footer · settings reorg · title menu)

**Planned 2026-07-28.** A deliberate pass on visibility, cleanliness, and discoverability, using the FabFilter Pro-Q 4 plugin as the reference: clean on its face, settings tucked out of the way but a click deep, advanced features nested so they're reachable for power users and ignorable for casual ones. Absorbs the previously-queued settings reorganisation as **13B**.

**Locked decisions (2026-07-28):**
1. **The hotbar and the footer split on word class.** Hotbar = verbs on content (add, undo, export, select). Footer = app state and view controls (saved, counts, storage, sizing). This is the rule for deciding where any future control goes; it's the same division Pro-Q's footer draws between plugin state and audio.
2. **The status footer is desktop-only.** Mobile already burns ~490px of chrome before the first entry renders, and the footer's contents can't fit one line at 375px. Mobile gets its own bespoke UI session later; until then its scaling controls stay in Settings.
3. **Footer height is expressed off `--ui-scale`.** A hardcoded height clips its own labels at 125% text scale — and the control that fixes text size lives *in* the footer, so the failure is self-inflicting.
4. **The resize grip moves into the footer** (Pro-Q's solution). A bar pinned to the bottom edge otherwise swallows the bottom-edge and SE-corner hit zones owned by `ResizeHandles.jsx`, and dragging the footer would resize nothing.
5. **Scaling settings move to the footer menu — not mirrored, no pointer left behind.** Window size, entry header height and FAB size currently live in three different Settings sections; moving them is what lets 13B collapse to four sections rather than merely re-home the same volume. Accepted cost: existing users relearn one location.
   - **Text size is the one deliberate exception and appears in both places.** It is an accessibility setting, and people who need it look for it under *Accessibility* — removing it from there to save a menu row would be a real regression for exactly the users who can least afford it. The footer copy is a convenience; the Accessibility section stays its discoverable home. Both read the same store field, so they cannot disagree.
6. **Reference/crosstalk stays where it is.** Considered for a footer readout and rejected — the current placement is fine and the footer shouldn't become a dumping ground.
7. **The lorebook title becomes a hover-highlighted field, not a live input.** Click opens the dual menu; double-click renames in place — the same gesture the menu's list already uses, so renaming is one gesture everywhere a lorebook name appears.
8. **No `< >` prev/next arrows on the title field.** `switchLorebook` calls `promoteInIndex` (`use-lorebook.js:60`), which moves the switched-to book to the front of the index — and the index *is* the list order. Stepping with arrows would oscillate between two books forever. Fixable by giving arrows a separate stable order, but judged not worth the complexity.
9. **The title menu's lorebook list sorts alphabetically**, not by recency, for the same reason: a list that reorders itself on every switch is disorienting to click through. Recency ordering stays on the lander, where it's actually useful.
10. **The full import flow lives in the dropdown via a takeover.** When a file parses, the lorebook column collapses to a ~34px rail and the import flow claims the menu's full width. Escalating to a separate panel was rejected — the flow gets *more* room this way than it has today.
11. **A pending parse is protected.** Outside-click must not dismiss-and-discard, and the dropdown's dismiss-stack priority must not let Escape destroy a parse.
12. **Legacy Lorebooks / Import-Export panels are a frozen compatibility path.** Kept working, but no new features ported to them. Without this, every addition gets built twice and the two silently drift.
13. **The hamburger becomes a gear whose icon follows the mode** — gear (straight to Settings, no intermediate dropdown) in the new system, hamburger in legacy, since a gear opening a three-item menu would be lying.
14. **Verify routes through the new UI by default**, plus one scenario that flips the legacy setting and confirms the old panels still open. Cheap insurance for a path we've promised not to break but would otherwise never exercise.

**Sub-phases, sequenced so nothing is built twice:** ~~13A footer shell + scaling menu~~ **shipped 2026-07-28** · ~~13B settings reorg~~ **shipped 2026-07-28** · ~~13C title field + dual dropdown + import takeover + gear~~ **shipped 2026-07-29** · ~~13D release notes + update notice + feature tour~~ **shipped 2026-07-31** (added mid-phase; not in the original plan).

**13A notes (shipped 2026-07-28).** `StatusFooter.jsx` (layout) + `ScaleMenu.jsx` (feature), `use-window-scale.js`, `use-save-status.js`, `constants/scaling.js`. Three things the build settled that the plan had guessed at:

- **`ResizeHandles` needed no change at all.** The bottom *edge* was never a resize target — only four 14×14 corner divs at `z-index: 150`. So the footer keeps a z-index below that and insets its controls ~20px from the right, and the SE corner keeps winning the hit test. Decision 4's "move the grip into the footer" turned out to mean "don't draw one" — the gold `corner--se` bracket already marks the spot, and a second glyph there would have collided with it.
- **`.floating-window` sets `overflow: hidden`**, so menu geometry is a hard constraint rather than a preference. At the 480px minimum width and 125% text the menu + flyout + gap must fit inside 460px of usable width; the min-widths are `calc(196px * var(--ui-scale))` and `calc(150px * var(--ui-scale))` against that budget, and the labels are `nowrap` so they can't wrap instead of overflowing.
- **Flyouts anchor `bottom`, not `top`.** The whole menu hangs off a bar at the base of the window, so a tall flyout aligned to its row's top runs off the bottom edge and gets clipped away. Everything here grows upward.

**13A feedback pass (2026-07-28, from user testing).** Six fixes plus one new surface:

- **Flyouts open right, which required portalling.** `.floating-window` clips overflow, so an in-window flyout could only ever fold back *left* over the menu — the two requirements are geometrically incompatible while the menu lives inside the frame. Menu and flyouts now portal to `document.body` positioned `fixed` from their anchor's rect (the pattern `ExportMenu` / `LorebookSwitchPopover` / `FolderFilterButton` already use), open right, and flip left only when the *viewport* can't fit them. The window's own width stopped being a constraint, so the min-width budget from 13A no longer binds.
- **Hover grace** (`FLYOUT_OPEN_MS` 150 / `FLYOUT_CLOSE_MS` 320, asymmetric like the FAB quick-menu's). Without the open delay a diagonal pointer unfurls every row it crosses; without the longer close delay the gap between row and flyout drops it mid-reach. Moving *between* rows once a flyout is already up skips the open delay, so tracking down the menu stays instant.
- **The custom size fields were unusable and the cause generalises.** They were controlled inputs bound to a value clamped on every keystroke: typing the first digit of `1360` into a field reading `480` produced `1`, which clamped straight back before the second digit landed, so the field snapped to a bound on every keypress. `CommitNumberInput` holds a draft while focused and commits (clamped) on blur/Enter. **Never bind an input directly to a clamped value** — clamp on commit.
- **Default window 760×620 → 1200×900**, with a one-time bootstrap migration: settings persist and win over the constant, so raising `DEFAULT_WINDOW` alone would have reached nobody who had already launched the app. Only an exact `LEGACY_DEFAULT_WINDOW` match is rewritten; a partial match counts as a deliberate choice. Presets rescaled around it (800×700 / 1200×900 / 1600×1000). The one-time fix-ups in `useBootstrap` now accumulate into a single patch so a later write can't clobber an earlier one.
- **Footer and its controls enlarged** (26 → 32px tall, 0.6875 → 0.75rem, real padding on the button); menu and flyout type up a step too. **"Entry header" → "Entry height".**
- **Lorebook pull tab** (`LorebookTab.jsx`) on the window's right edge. It toggles the existing Lorebooks side panel, which is the one layout that leaves the entry list genuinely unobstructed — `useMenuPanel` *widens the window* by `MENU_PANEL_WIDTH` rather than taking space from the list. This answers the repeated "I want the lorebook list in the side panel" feedback without a presentation mode, and it means 13C's title menu doesn't have to be the only way to reach the list.

**Second feedback pass (2026-07-28).**

- **The tab became a real layout column, not an overlay.** As an absolutely-positioned element it sat on top of entry rows and the scrollbar. `FloatingWindow` now nests the app in `.window-shell` (row) → `.window-stack` (column), with the tab as a full-height sibling column: content is inset by it, nothing can run underneath, and it holds at any size including full screen. It spans the corners now, so the resize handles keep working purely on z-index (150 vs the tab's flow level) — verified by hit test rather than by geometry.
  - **Layout and look are separate concerns here, and conflating them was the mistake.** Painting that whole column made the edge far too heavy. The column only reserves the gutter; `.lorebook-tab-inner` carries the original short centred pill — left-rounded, `--surface2`, flush to the frame. The button stays the full column, so the hit target is generous while the chrome is light. The gutter is transparent because `.window-body` and the entry list set no background of their own, so it inherits `--surface` from `.floating-window` and blends rather than reading as a stripe.
- **`writing-mode: vertical-rl` alone lays the word on its side**, which is the hard-to-read orientation. `text-orientation: upright` stacks the glyphs the right way up, so the label reads like a book spine.
- **The `⤢ Size` button is hover-to-surface, click-to-pin** (`SCALE_MENU_OPEN_MS` 180 / `SCALE_MENU_CLOSE_MS` 300), matching FabFilter's footer controls. Two independent states — `scaleOpen` and `pinned` — because "showing" and "latched" are genuinely different: a pinned menu ignores the pointer leaving. Flyouts are portalled *separately* from the menu, so moving from menu into flyout counts as leaving the menu; the flyout has to cancel the footer's close timer too, which is why the enter/leave handlers thread all the way down through `ScaleRow`.
  - **After an unpinning click the menu must stay shut while the pointer is still on the button.** Re-surfacing from the hover already in progress would make the click unable to dismiss anything. You have to leave and come back — the behaviour is deliberate, and there is a check pinning it down.

Scaling settings left Settings in this phase rather than 13B — leaving them in both places would have contradicted decision 5 for a whole phase. `verify/checks.mjs` drives the folder-header-height check through the new menu via the `openScaleMenu` / `setScaleOption` / `closeScaleMenu` driver helpers, and `scenario()` now takes launch overrides so a check can assert a desktop-only surface is absent on mobile.

**Mockup:** `mockup-ui-overhaul.html` (repo root) covers 13A and 13C in five walkable states. Dark-theme only and throwaway — do not make it theme-aware. 13B was deliberately not mocked; an accordion with different contents is better reviewed as a written outline than as pixels.

**Open at mockup time:** whether "Reset all sizing" should also reset text size (leaning no — it's an accessibility setting and wiping it from a general reset reads as hostile). The `AppendImportPanel` / `ImportPanel` question was **resolved in 13C**: neither retires, and all three surfaces share one flow instead — see below.

**13C — Header rebuild + shared import flow. Shipped 2026-07-29.**

Landed in four passes: title field + dual dropdown · gear + header declutter · feedback polish · shared import flow.

Decisions and findings from the build:

- **The book list is recency-ordered by default, with an A–Z toggle.** ~~Alphabetical, not recency-ordered.~~ **Reversed on user feedback, 2026-07-30.** The original argument was that `promoteInIndex` (`use-lorebook.js`) moves the active book to the front of the stored index on every switch, so a recency list would reshuffle under the cursor — the same store behaviour that killed the `< >` arrows at planning time. Two things were wrong with it. The reshuffle is invisible where it was supposed to bite: the title menu *closes* when you switch books, so the list is rebuilt on next open rather than moving while you look at it. And it optimised for the wrong task — people return to what they were just working on far more often than they hunt for a name they already know. Order is snapshotted on open (`use-sorted-lorebooks.js`) so it cannot move mid-interaction under either mode, and `settings-store.lorebookSort` is read by every list of books so the title menu and the side panel can't disagree. **The lesson worth keeping: "the data reorders itself" is an argument about a *visible* reshuffle, and it only lands if the surface stays open across the reorder.**
- **Rename moved from an always-live input to double-click.** An input that is permanently focusable makes a poor menu button, and a name you can edit by accident is worse than one you edit deliberately. It's covered by a check so it can't quietly rot.
- **The header's Switch button is gone** — the title field does that job. `LorebookSwitchPopover` stays; the crosstalk role bar still uses it.
- **Open/close orchestration lives in `WindowHeader`, not `TitleMenu`**, mirroring how `StatusFooter` owns it for the sizing menu. Hover/pin/outside-click/resize all sit beside the trigger, and the menu only renders and asks to close.
- **A portaled menu's outside-click test must exclude its own anchor.** Without it, `mousedown` closes the menu and the click that follows reopens it — so a second click on the trigger appears to do nothing. This is a general trap for every portaled-menu-plus-trigger pair, and it's why clicking the title twice was broken on first ship.
- **The title needed an accent ring at rest.** A borderless title read as text; testers didn't know it was clickable. It uses `--accent`, the FAB's token, so the app's two "this is a thing you press" cues stay congruous under a themed accent.
- **Popovers anchored with a hard `top: anchorRect.bottom` break when their trigger moves.** Both storage popovers were written when the ring sat under the title bar; moving it to the footer pushed them off the bottom of the screen. `use-anchored-position.js` flips to a `bottom` anchor when the trigger is in the lower half of the viewport, which grows the popover upward with no measurement pass — the same trick the sizing flyouts use. **Any new anchored popover should use it rather than hardcoding a side.**
- **The legacy-menus setting is narrower than the plan implied.** It only decides whether the header button is a gear (straight to Settings) or the ☰ with three destinations. The side panels always exist; nothing about the title menu or the relocated footer items is conditional on it. A wider dual path would have doubled the surface area of the header for no benefit anyone asked for.

**The import flow is now one thing (`use-import-flow.js` + `ImportFlow.jsx`).** This resolves the question deferred at mockup time — neither old panel retires, they share a flow instead. What made that necessary rather than merely tidy: each surface had a *different subset* of the same feature. The side panel offered backup-before-replace but couldn't take pasted text; the hotbar overlay took pasted text but had no backup, and shipped "open the Import / Export tab" nudges for the flows it couldn't do. Which surface you happened to open decided what you were allowed to do, and the nudges were the code admitting it.

- **The dropdown takes over rather than handing off.** The first pass routed Import to the side panel, which meant clicking Import in a menu opened a different surface elsewhere. The books column collapses to a rail (`.tm-rail`, back button visible) and the flow gets the menu's width.
- **The hotbar's three-mode segmented control is gone.** It existed only because that surface could only append, forcing paste / entries-from-file / whole-book to be picked before a file was even chosen.
- **Paste sits behind a link, not a segmented control** — it's the niche path and shouldn't cost the drop zone half its surface. Pasted entries now reach all four dispositions; they used to be append-only.
- **Backups are JSON only.** TXT is a lossy export; as a pre-overwrite backup it's the wrong artefact, and offering it invites someone to pick it and lose their triggers.
- **Back from the preview keeps the parse.** Changing your mind about a disposition shouldn't cost re-picking the file.
- **"Replace with 29 entries", not "Replace 29 entries"** — the latter reads as though 29 are being deleted. The count is always what's arriving.
- `use-append-import.js` deleted (sole consumer was the overlay). `DropZone` gained an optional `inputRef` so the Import hotkey can click the hidden input directly. The export-filename sanitiser moved to `services/export-filename.js`. ~~Still copy-pasted in five other call sites.~~ **Done 2026-07-31** — it was 8 inline copies across 4 files (`LorebookSwitcher`, `LorebookPanel`, `ExportPanel`, `ExportMenu`), all now going through `useExport()`, which already re-exported the service. Nothing was broken; the point is that the next change to the rule (allow spaces, cap the length) would have had to find all 8 by hand, and a missed one makes two export surfaces disagree — the same failure the shared import flow exists to prevent.

**13D — Release notes, update notice, feature tour. Shipped 2026-07-30/31.**

Not in the original 13 plan. It came out of asking how anyone who *isn't* in the Discord finds out what changed — the walkthroughs written for each pass only ever reached people already following the project.

- **The changelog became release notes rather than a development log.** It is rendered in-app twice (the lander's *What's new* panel and the update notice), so it is written for users. One section per public release, not per phase or per working day; entries describe the delta from the last *released* version. Two rules follow, and both cut real entries: **if a user could not have experienced the old behaviour, there is no entry** (the pull tab never shipped in an earlier form, so "moved the pull tab" is not a fix — it's part of one new feature), and **iterations collapse** (three passes on one control across a release is one entry). Technical changes are siloed under `Under the hood`, which `services/release-notes.js` filters out of the in-app notice. The rules live in `CLAUDE.md`; the reasoning stays here so the two don't drift.
- **Dated work-day sections were not releases.** The 07-28 and 07-29 sections were merged into `## 0.9.0 — 2026-07-30`. This was not tidying: the notice stores the heading text as the identifier of what a user has seen, so with two sections a returning user would have been shown one and silently skipped the other.
- **0.9.0, not 1.0.** The builder has never had a formal release. 1.0 is reserved for the site integration, so the current state is deliberately pre-release. `package.json` is the source; `vite.config.js` injects it as `__APP_VERSION__` and `constants/version.js` exports it, so the footer and the notice cannot disagree about which build is running.
- **Annotated screenshots, not a tour engine.** A live tour driving the real UI would have to open menus, cope with targets that don't exist until something is open, and handle the window moving underneath it. Screenshots have none of those failure modes and a 0.9.0 image stays correct for 0.9.0 forever — staleness becomes an archive rather than a bug. `verify/screenshots.mjs` drives the real app to generate them; `constants/tour-steps.js` is the single source for the generator and the tour both.
- **The notice must read the lorebook index from storage, not the store.** The store hydrates after first render, so a returning user looked like a first-time user for one frame and got silently seeded as "already seen" — the notice then never appeared for exactly the people it exists for.
- **Words are HTML, never painted into the image.** The first version baked a legend into each PNG. Pinned to the window's bottom edge it covered whatever the shot was about whenever that sat low, and it vanished the moment anyone enlarged the image — so a readable screenshot and its explanation could never be on screen together. Text baked into a PNG also ignores the text-size setting, can't be selected, and is invisible to a screen reader.
- **Badge numbering needs exactly one authority.** The generator sorted marks into reading order and numbered *that*, while the tour numbered the array it renders; every badge on a step pointed at a different label than its number. The array is now the only authority and the generator lints the result against geometry. **This is the general shape of the bug: two consumers deriving the same ordering independently.** The fix is never to make both sorts agree — it's to make one of them stop sorting.
- **Captures were never of the builder's default size.** Bootstrap sizes a first-run window from the viewport (two thirds of its width, its full height), so every shot was of a shape no user's default looks like — and the extra height is what made the images unreadable in the tour. Scenes pick the Medium preset through the real UI, so the captures track the default if it changes.
- Full detail on the generator — corner placement, collision scoring, cropping, per-scene storage reset — is in `screenshots/README.md`.

**The long-form walkthrough became `announcements/0.9.0-ui-overhaul.md`.** It was drafted as a Discord post and kept being treated as documentation, which is what made it rot: docs get maintained, announcements get published and then become history. Moving it out of `docs/` says which it is. It now embeds the six generated screenshots with the same numbered labels the tour renders, and it got the same content pass the changelog did — the passages describing states no released build ever had (the second-click fix, the typeable custom-size boxes, the popover direction) are gone, and the claim that the book list is alphabetical was corrected. The three slots the generator has no scene for were dropped rather than left as placeholders.

---

**Verify note.** `MenuPanel` keeps all three of its sections mounted (`display: none`) so panel state survives a tab switch — which means the side panel's import flow is in the DOM *at all times*. An unscoped `.drop-zone` or `.import-flow-*` locator therefore reaches into whichever surface comes first in the DOM. The parity scenario scopes every locator to one surface; the first draft did not, and was silently measuring the wrong one. **Scope to a surface whenever more than one can render the same component.**

---

**13B — Settings reorganisation. Shipped 2026-07-28.**

Final grouping (six sections → four), by *what you are changing*:

| Section | Contents |
|---|---|
| **Editing & Entries** | writing aids · counters · entry badges · entry history |
| **Appearance & Accessibility** | theme + custom colors · accessibility · funny fish |
| **Layout & Controls** | keyboard shortcuts · hotbar · FAB menu · folders · reference panel · menus |
| **System** | browser storage limit |

Decisions taken during the build:

- **Keyboard shortcuts left Accessibility for the top of Layout & Controls**, beside the other input surfaces. This reverses 10D's placement. `KeyboardHelpOverlay`'s deep-link travels with them (`openSettingsSection('controls')`) — that link, not browsing, is how keyboard users actually reach the editor. The section name was the sticking point, not the section: "Advanced" and "Miscellaneous" are both names nobody searches, which is why System ended up holding one setting rather than absorbing shortcuts to justify itself.
- **Entry history dropped to the foot of its section.** Tallest block in Settings and a set-once, per-book opt-in — leading with it was the clearest inversion of the ordering principle.
- **Condensed-row stats moved to Editing & Entries**, filed as an entry-badge setting that merely happens to apply inside folders.
- **Every section starts collapsed.** Opening Settings shows four headings, so the panel reads as a menu you choose from.
- **The filter box matches a keyword index, not visible labels** (`constants/settings-search.js`). "hotkey" has to find Keyboard shortcuts and "dark mode" the theme picker, which label text alone cannot do. The index lives in constants because two callers need it — the group deciding whether to render, and the section deciding whether to render at all. Terms are ANDed so extra words narrow. Sections force open while filtering; dividers hide, since the runs they label are no longer intact. `ThemeSettings` / `AccessibilitySettings` are wrapped as groups so they filter individually rather than travelling together.
- **The box is sticky.** The keybinding table alone is taller than the panel, so a filter that scrolled away would vanish exactly when it is most needed.

**Verify note.** Section titles are load-bearing — all eight `openSettingsSection` call sites moved. Two existing scenarios failed *correctly* and were fixed rather than adjusted around: one relied on Editing & Entries being open by default, and one was aimed at the wrong new section by a blanket `Folders` → `Layout & Controls` rename (condensed-row stats went to Editing & Entries instead). A blanket rename across a re-home needs checking per call site, not per string.

---

**Original diagnosis (2026-07-27), kept for context.**

**Raised 2026-07-27 from user testing.** Settings has accreted section by section as features landed, and options are now in places that make sense only historically. Finding a given setting means guessing which section it grew up in rather than which one it belongs to.

Concrete examples of the drift:
- **Entry header height** sits under *Editing & Entries*, but it is purely a layout/row-density control and reads as belonging with *Window & Layout*.
- *Editing & Entries* has become a catch-all — counters, trigger delimiter, entry stats, private-entry marking, hotbar slots and row height all share it, with no ordering principle among them.
- **Folders** is its own section while **Reference & Crosstalk** is another, yet folder behaviour *in* crosstalk is explained in neither.
- Density and sizing controls are split across three sections (*Editing & Entries*, *Window & Layout*, *Appearance*) with no obvious rule for which lands where.

Worth doing as a deliberate pass rather than incrementally: decide the grouping principle first (by *what you are changing* — content, layout, appearance, behaviour — rather than by which feature introduced it), then move everything at once. `pendingSettingsSection` deep-links and the `openSettingsSection` verify helper both key off section titles, so a rename or re-home has to update those together. Purely a re-organisation — no setting should change meaning or default.

**Target shape (2026-07-28): six sections down to four**, grouped by what you're changing rather than by which feature introduced it.

1. **Editing & Entries** — suggestions default, thesaurus, tiered counters + thresholds, stats badges, private markers, entry history. History moves to the *bottom* of the section: it's the tallest block in Settings and a per-book opt-in a user sets once, so leading with it is the clearest inversion of the ordering principle.
2. **Appearance & Accessibility** — theme + custom colors, text size, reduce motion, high contrast, funny fish. The word "Accessibility" stays in the title deliberately; folding it silently under "Appearance" would be a real discoverability regression for the people who search for that word.
3. **Layout & Controls** — window defaults, hotbar slots, FAB quick menu, folder collapse stages, condensed-row stats, keep-menu-open-after-import, reference panel + swap mode, legacy-menus toggle.
4. **Advanced** — keyboard shortcuts, browser storage limit.

Plus **sub-dividers within sections** (thin "History" / "Counters" labels) so ordering has a visible logic rather than an implied one, and a **filter box** at the top of the panel — the highest-value addition to a panel this dense, since it makes "which section is it in?" stop mattering. A filter match must force its section open, or it surfaces nothing.

**Migration surface:** section titles are load-bearing. `verify/driver.mjs:128`'s `openSettingsSection(page, title)` matches on title text, with call sites in `verify/checks.mjs` for `Folders`, `Editing & Entries`, and `Reference & Crosstalk`, plus `verify/screenshots.mjs`. `pendingSettingsSection` deep-links by section id and `KeyboardHelpOverlay.jsx:23` hardcodes `'accessibility'`. All of it moves in the same commit or the suite goes red.

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
