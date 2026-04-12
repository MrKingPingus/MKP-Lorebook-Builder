# Services Reference

Plain JS modules in `src/services/` — no React imports.

| File | Responsibility |
|------|---------------|
| `storage-service.js` | **Only** file that reads/writes `localStorage` |
| `autosave.js` | Debounced subscriber that persists active lorebook |
| `entry-factory.js` | Creates new entry objects with default shape |
| `lorebook-index.js` | Builds/maintains the lorebook index |
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
