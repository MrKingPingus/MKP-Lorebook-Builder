# Test fixtures

Sample lorebooks used to exercise the app during development and verification —
not shipped with the build.

## `reika-test-book.json`

A CharSnap-shaped lorebook (34 entries) used to verify import parity and any
feature that operates over real entries. Deliberately spans coverage:

- **All five entry types** — Character, Item, PlotEvent, Location, Other.
- **A mix of `isPublic`** — five entries are Private, the rest Public (for
  testing per-entry Public/Private, All Public / All Private, and export shape).
- **Long trigger lists, `\r\n`, and `{{user}}` macros** — exercises the
  importer's trigger cap, unescape, and normalization paths.

Load it via the app's normal Import (File or Paste) flow. Note that
`hiddenFromExport` is an app-internal flag and is **not** carried in the
CharSnap JSON, so an imported book always arrives fully visible; toggle
Hide-from-Export inside the app when testing that feature.
