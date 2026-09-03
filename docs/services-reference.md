# Services Reference

Plain JS modules in `src/services/` — no React imports.

| File | Responsibility |
|------|---------------|
| `storage-service.js` | **Only** file that reads/writes `localStorage`. Lorebooks go through `saveLorebook` / `saveLorebookIndex` rather than raw `writeJson` — those enforce that an **ephemeral** book (the feature tour's samples) never reaches storage, a rule that has to hold across eight write sites |
| `autosave.js` | Debounced subscriber that persists active lorebook |
| `entry-factory.js` | Creates new entry objects with default shape; exports the shared `uid()` and `cloneEntry` (fresh id, no folder — a `folderId` names a folder in the *source* book. `keepSnapshots` / `keepModified` opt out of the two defaults a cross-book transfer needs to differ on) |
| `entry-transfer.js` | Copy or move entries between two lorebooks (#127). Pure: takes two lorebook objects, returns two new ones — a move produces both at once so a caller cannot persist half of it. Also owns `moveConfirmMessage`, the undo caveat both entry points must state |
| `warning-color.js` | The single green/yellow/(orange/)red evaluator behind every counter, badge and gauge. Each metric builds its own stops (`charStops`, `triggerStops`, `titleStops`, `storageStops`) because the fourth colour is *appended* for characters and storage but *inserted* for triggers and titles — a shared rule would move an existing user's red |
| `category-tree.js` | The pure tree over flat `{id, parentId}` nodes — parentage, depth, subtrees, cycle-safe `canNest`, breadcrumb `pathTo`. Shared by entry folders and template categories; knows nothing about entries, which is what makes it shareable. `maxDepth` is a parameter, not a constant |
| `template-service.js` | Entry Templates (#114): what an entry contributes to a template, which fields a template can contribute back (the content-driven checklist), and how a fill resolves a description that already has text. Pure |
| `folder-tree.js` | Folder creation, entry assignment (with the `entries[]` splice that keeps a folder's members contiguous), removal, the render walk the entry list consumes, and the folder-filter predicate (`filterEntriesByFolders` / `pruneFolderFilter` — pruning is what makes a deleted folder or a crosstalk role swap degrade to "no filter" instead of an empty list) |
| `drag-drop.js` | Drop resolution — turns "these ids were dropped here" into the next `entries[]` (and `folders[]` for a folder drag). The drop position implies the parent, so order and `folderId` are written together. Pure |
| `selection-range.js` | Modifier+click gesture table — resolves a click into add/remove plus the ids it applies to (`rangeBetween`, `resolveSelectionClick`). Pure; no store access |
| `lorebook-index.js` | Builds/maintains the lorebook index |
| `export-filename.js` | Turns a lorebook name into a safe download filename. Extracted from the export paths; several call sites still carry their own copy of the same sanitiser |
| `release-notes.js` | Parses `CHANGELOG.md` into releases (`parseReleases`, `latestRelease`), strips the `Under the hood` section for the in-app notice (`userFacingBlocks`), and decides whether the update notice is due (`shouldShowUpdateNotice`) |
| `suggestion-engine.js` | Generates trigger/keyword suggestions |
| `scan-service.js` | Generic lorebook scanner for trigger crosstalk and duplicate detection |
| `entry-health.js` | Evaluates entry health (empty fields, limit warnings) |
| `rollback-service.js` | Manages entry snapshots for the rollback system |
| `find-replace.js` | Find & replace logic over entry fields |
| `html-escape.js` | Sanitises strings for safe HTML rendering |
| `json-export.js` / `json-import.js` | JSON lorebook format |
| `txt-export.js` / `txt-import.js` | Plain-text lorebook format |
| `docx-export.js` / `docx-import.js` | DOCX lorebook format |
| `zip-builder.js` | Packages multi-file exports into a ZIP |
