# Mobile findings — pre-overhaul sweep

Working document for Phase 14. Produced by the mobile suite added in 14A
(`verify/mobile-checks.mjs` + `verify/layout-invariants.mjs`), run against
0.9.0 at commit time.

**This file is temporary.** Its contents belong in Phase 14's sub-phases once
those are written; delete it when the overhaul lands. Findings that a user can
hit today, independent of the overhaul, should be filed as GitHub issues
instead — this document is for the things the redesign itself needs to answer.

Reproduce with:

```bash
npm run verify -- mobile          # the whole mobile suite
npm run verify -- "mobile sweep"  # layout sweeps only
```

---

## Headline

The mobile UI is **structurally sound and dimensionally wrong.**

Across 23 scenarios and 30-odd poses, at five viewports from 360px to a
landscape 780×360, there were **zero** hard layout violations: nothing renders
off-screen, nothing overflows the body horizontally, no control is covered by a
layer that shouldn't cover it, and no page threw. The stress tier — 25 triggers,
a 1500-character description, 240-character names, 500 entries — produced none
either.

What it did produce is **227 notes, and all but three of them are one problem**:
controls sized for a mouse. Plus three gaps in the Escape stack.

---

## F1 — The mobile-only layers are not in the dismiss stack

**Severity: real, small fix, worth doing before the overhaul rather than during.**

The app has a proper Escape priority stack (`services/dismiss-stack.js`, via
`hooks/use-dismiss-layer.js`). Seven components register with it:
`FeatureTour`, `FolderHeader`, `KeyboardHelpOverlay`, `MoveToFolderButton`,
`TitleMenu`, `UpdateNotice`, `StatusFooter`.

**None of the mobile-only layers do.** Escape does not close:

| Layer | Escape closes it? |
|---|---|
| `EntryDetailPanel` | no |
| Settings panel (`.menu-panel`) | no |
| `FabQuickMenu` | no |
| `TypeFilterBar` popover | yes — but see below |
| `ReferenceBrowseSheet` | not registered |
| `ReferenceEntryOverlay` | not registered |

The filter popover works because `TypeFilterBar.jsx:44-51` carries its own
`document` keydown listener that calls `stopPropagation` — a private workaround
that bypasses the stack rather than joining it. So the one layer that behaves
correctly does so by the mechanism the stack exists to replace.

On a phone this mostly bites with an external keyboard, but it also applies to
any desktop browser window narrower than 768px, and it means these layers sit
outside the app's single dismissal ordering. Pinned as quirks in
`Mobile: Escape closes the transient layers` and in the FAB long-press scenario,
so they surface as notes rather than being asserted as correct.

## F2 — A panel left open across the breakpoint becomes a full-screen overlay

**Severity: real, and a consequence of F1 more than a bug of its own.**

`.menu-panel` is a 320px column beside the builder above the breakpoint and a
full-screen overlay below it. Nothing reconciles the two when the viewport
crosses — which happens when a phone rotates, or a desktop window is dragged
narrow. The panel stays open and covers the entire builder.

Fixing F1 does not fix this on its own: the panel can legitimately be open when
the crossing happens. Phase 14 should decide whether crossing the breakpoint
closes open layers or re-poses them.

Covered by `Mobile: settings panel open across the breakpoint`.

**This also had a testing consequence.** `pairCrosstalk` in `verify/driver.mjs`
used `Escape` to close the settings panel after enabling the reference panel.
Because of F1 that Escape did nothing, so **every desktop crosstalk scenario has
been running with the settings panel open** — invisible on desktop, where the
panel sits beside the builder. Fixed in this branch: it now clicks
`.menu-panel-close` and waits for the panel to actually go.

## F3 — Tap targets are sized for a mouse, throughout

**Severity: systemic. This is the overhaul's main brief.**

**57 distinct controls** render below 32px on at least one axis. A further **14**
land in the 32–43px band (under the 44px Apple HIG / WCAG 2.5.5 figure, but
usable). This is not a handful of oversights — it is the desktop density
carried across the breakpoint unchanged.

Worst offenders:

| Control | Size |
|---|---|
| `settings-label > input` (checkboxes) | 13×13 |
| `export-menu-close` | 19×18 |
| `entry-ref-badge` (in the mobile card row) | 52×19 |
| `suggestions-toggle` | 227×17 |
| `import-flow-swap` | 139×17 |
| `card-action-btn`, `card-action-btn--remove` | 21px tall |
| `suggestion-chip`, `trigger-input`, `rollback-footer` buttons | 21px tall |
| `entry-detail-back`, `entry-detail-remove` | 26 / 25px tall |
| `menu-panel-close` | 24×24 |
| `chip-delete` | 28×28 |

Because it is systemic, the suite grades tap-target size as a **note, not a
failure** — see the comment on `HARD_RULES` in `verify/layout-invariants.mjs`.
Failing on it would mean a permanently red suite reporting one fact 227 times.
Once the overhaul sets a floor, raise `TAP_TARGET_HARD` to it and promote the
rule.

## F4 — A phone in landscape gets the desktop layout

**Severity: worth an explicit decision, currently untested territory for users.**

`useMobile()` is `window.innerWidth < 768` (`src/hooks/use-mobile.js:5`). A
phone turned sideways is around 780px wide, so it renders the **full desktop
layout in a 360px-tall viewport** — floating-window chrome, resize handles,
status footer, the lorebook tab, and desktop-density controls (type pills at
22px tall, card action buttons at 21px).

It is not broken — the containment sweep passes at 780×360 — but it is a pose
nobody designed for, reached by an extremely common gesture. Phase 14 should
decide whether the breakpoint should consider height or orientation, not width
alone.

Also: `useMobile` listens only for `resize`, never `orientationchange`.

Covered by the `landscape 780x360` row of the viewport matrix.

## F5 — Always-mounted layers

**Severity: minor, but it shapes how anything tests or reads this UI.**

`.entry-detail-panel` and `.menu-panel` are always in the DOM; only the
`--open` / `--expanded` modifiers say whether they are showing. Any check for
"is the panel open" that looks for the element rather than the modifier is
silently wrong — this cost time during 14A and is now documented in
`verify/driver.mjs` and encoded in `detailOpen()` / `openEntryDetail()`.

Worth confirming during the overhaul that a closed-but-mounted panel is hidden
from assistive technology, not merely sized to zero.

---

## What is already solid

Recorded so the overhaul does not spend effort re-solving it, and so a
regression here is visible:

- **Containment.** No element off-screen left or right, and no horizontal body
  scroll, at any of the five viewports or in any of the ~30 poses.
- **Hit testing.** No control is occluded by a layer that shouldn't cover it —
  including the search dropdown, which looked like a z-index bug until the sweep
  learned to account for scrolled-out-of-view rows.
- **Long names.** A 240-character entry name stays on one line, ellipsises, and
  leaves the chevron in place; the row height does not move. Pinned by three
  assertions in `Mobile stress: names far past the title cap`.
- **The limits.** 25 triggers, a 1500-character description, 500 entries and 40
  fully-maxed entries all render without a hard violation on a 390px screen.
- **The long-press paths.** FAB long-press opens the quick menu and correctly
  suppresses the trailing click; a short tap adds an entry and opens it. Both
  driven with real touch events.

## Not covered

Gaps to close if Phase 14 wants them, listed so they are not mistaken for
passes:

- **Folder depth on a narrow screen.** Folders are app state, not part of the
  CharSnap import format, so the stress generator cannot produce them; a
  depth-3 tree at 360px would need UI setup or a seeded store.
- **`MAX_LOREBOOKS` (50) and `MAX_HISTORY` (50).** Same reason — both need
  seeded state rather than an imported book.
- **Near-quota storage.** Needs a seeded `localStorage` close to the 5MB WebKit
  figure; the ring's mobile branch (`StorageUsageRing.jsx:25,30`) no-ops its
  popovers, so there is behaviour there nothing exercises.
- **`HiddenEntriesPopover`.** The fixture has no hidden-from-export entries, so
  the pose needs setup first.
- **Pick-from-Reference commit.** The entry point is swept; the commit path is
  not driven end to end.
- **Real devices.** Everything here is Chromium under emulation. iOS Safari's
  viewport units, the swallowed-click behaviour the long-press handlers already
  work around, and momentum scrolling are all unreachable from this harness.
