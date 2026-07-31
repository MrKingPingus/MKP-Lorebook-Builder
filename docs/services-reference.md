# Services Reference

Plain JS modules in `src/services/` — no React imports.

| File | Responsibility |
|------|---------------|
| `storage-service.js` | **Only** file that reads/writes `localStorage` |
| `autosave.js` | Debounced subscriber that persists active lorebook |
| `entry-factory.js` | Creates new entry objects with default shape; exports the shared `uid()` |
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
