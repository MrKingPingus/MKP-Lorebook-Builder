# Host mode — embedding the builder in another site

The builder can run inside an `<iframe>` on a host site that owns the
lorebook's storage. In that mode the host does every server call; the builder
keeps its local drafts, undo history and checkpoints in its own `localStorage`
and talks to the host over `postMessage`. Nothing about the standalone app
changes: host mode is off unless both conditions below hold.

This document is the contract. The builder's side lives in
`src/constants/host.js` (names, origins, limits), `src/services/host-bridge.js`
(origin checks), `src/services/host-serialize.js` (wire mapping),
`src/services/host-limits.js` (validation) and `src/hooks/use-host.js`
(everything else).

## Turning it on

Host mode is enabled when **both** are true at page load:

1. the URL carries `?host=charsnap`, and
2. the page is framed — `window.parent !== window`.

The flag alone at top level shows the ordinary standalone app, so a copied or
bookmarked iframe URL is harmless.

In host mode the builder:

- fills the iframe (no floating window, drag, resize, pull tab, or close button);
- skips the landing page and shows a "Connecting…" screen until `mkp:load`;
- hides everything that switches, creates, renames or deletes lorebooks (the
  host owns which book is open and what it is called), including
  "Import as new" in the import flow;
- adds a **Save to CharSnap** button (header and hotbar) and a **Mod+S** binding;
- hard-caps typing at the host's limits (see *Limits*);
- takes its theme from the host, without persisting it.

## Origins

Both sides check `event.origin` on every message.

- The builder accepts messages only from the allowlist in `HOST_ORIGINS`
  (`https://charsnap.ai`, `https://www.charsnap.ai`, `http://localhost:3000`),
  and only when `event.source === window.parent`. The first valid inbound
  message locks the builder onto that one origin for the rest of the session.
- The builder posts only to a named origin, never `'*'`. Before the host has
  spoken it posts `mkp:ready` once per allowlisted origin (the browser delivers
  it only where the parent's origin matches); afterwards it posts to the locked
  origin alone. `location.ancestorOrigins` (Chrome/Safari) or the referrer is
  used to skip the broadcast where available.
- The host should accept messages only from the builder's origin and only when
  `event.source` is the iframe's `contentWindow`, and should post with the
  builder's origin as `targetOrigin`.

The deployed builder sends `Content-Security-Policy: frame-ancestors` for the
same three origins (`public/_headers`).

## Envelope

Every message is a plain object with `type` at the top level and every other
field flat beside it. Unknown `mkp:*` types are ignored by both sides.

### Entry (wire shape)

```json
{
  "name": "Ashfall Keep",
  "triggers": ["keep", "fortress"],
  "description": "A basalt fortress on the caldera rim.",
  "entryType": "Location",
  "isPublic": true,
  "disabled": false
}
```

- `entryType` is one of `Character | Item | PlotEvent | Location | Other`
  (the label form). The builder maps unknown values to `Character`.
- `disabled` is the builder's *Hide from export* flag. A disabled entry stays in
  the book but never fires in chat. It round-trips: `hiddenFromExport` ⇄
  `disabled`.
- Text fields are copied **verbatim** in both directions. The builder does not
  run its file-import unescaping on host payloads.

### builderMeta

The builder-only layer, stored opaquely by the host and handed back unchanged.

```json
{
  "version": 1,
  "folders": [
    { "id": "f1", "name": "Places", "color": "#fbbf24", "parentId": null, "collapseState": "full", "order": 1 }
  ],
  "entryMeta": [ { "folderId": "f1" }, { "folderId": null } ],
  "allowedOverlaps": ["keep"]
}
```

- `entryMeta` is index-aligned with `entries`. If the host knows the entry
  count changed outside the builder (the classic editor added or removed one),
  send `entryMeta: []` — folders survive, placements are dropped.
- `builderMeta` may be `null` for a book the builder has never saved.
- A `version` other than `1` is ignored (folders empty), not an error.

## Messages

### iframe → host

| type | fields | when |
|---|---|---|
| `mkp:ready` | `protocolVersion: 1`, `appVersion` | once the listener is up. The host answers with `mkp:theme` (optional) then `mkp:load`. |
| `mkp:dirty` | `dirty: boolean` | whenever the flag flips, plus once after every load and after every `mkp:saved`. |
| `mkp:save` | `hostId \| null`, `name`, `entries[]`, `builderMeta`, optional `force: true` | the user pressed Save / Mod+S, or the host sent `mkp:request-save`. **All** entries, in current order, hidden ones included. |
| `mkp:request-load` | — | the user chose **Reload from CharSnap** in the conflict dialog. The host answers with a fresh `mkp:load` for the same `hostId` (re-fetched, carrying the newer `updatedAt`). |
| `mkp:error` | `message` | a host payload was malformed and was not applied. |

### host → iframe

| type | fields | notes |
|---|---|---|
| `mkp:load` | `hostId \| null`, `name`, `updatedAt \| null` (ISO), `entries[]`, `builderMeta \| null` | see *Load semantics*. |
| `mkp:theme` | `tokens: { --bg, --surface, --border, --text, --muted, --accent, --blue }` | any subset; hex colours only (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`) — other values are dropped token by token. Applied immediately, never persisted. |
| `mkp:set-name` | `name` | the host owns the name; the builder applies it and counts it as a change. |
| `mkp:request-save` | — | same as the Save button. |
| `mkp:saved` | `hostId`, `updatedAt` | the save the builder posted was written. |
| `mkp:save-rejected` | `errors: [{ index, field, message }]` | validation failed; `index: -1` is lorebook-level. An **empty** `errors` array cancels the pending save without showing anything (the host uses it to unlock Save after a `mkp:set-name`, then sends `mkp:request-save`). |
| `mkp:save-failed` | `reason: 'conflict' \| 'error'`, `message` | `conflict` opens the Overwrite / Reload / Keep editing dialog; anything else is a footer notice. |

## Sequence

```
host                                   builder
 │  (iframe loads ?host=charsnap)         │
 │ ◄──────────── mkp:ready ───────────────│
 │ ──────────── mkp:theme ──────────────► │  (optional, repeat on theme change)
 │ ──────────── mkp:load ───────────────► │  find / create / reconcile draft
 │ ◄──────────── mkp:dirty{false} ────────│
 │                                        │  user edits …
 │ ◄──────────── mkp:dirty{true} ─────────│
 │                                        │  Save / Mod+S / mkp:request-save
 │ ◄──────────── mkp:save ────────────────│  (button locks, 15 s timeout)
 │ ──────── mkp:saved | save-rejected | save-failed ──► │
 │ ◄──────────── mkp:dirty{…} ────────────│
 │                                        │  on save-failed{conflict} → "Reload from CharSnap"
 │ ◄──────────── mkp:request-load ────────│
 │ ──────────── mkp:load (fresh) ───────► │  dirty + newer → Resume / Use CharSnap's version
```

The host must not send `mkp:load` before it has seen `mkp:ready` for the
current frame load. Reset any "ready" state on the iframe's `load` event: a
reload inside the frame starts the handshake over.

## Load semantics — which copy wins

Every host-bound draft remembers four things: `hostId`, `hostPending` (a new
book the host has not created yet), `hostSyncedAt` (the `updatedAt` it was last
synced to) and `hostSyncedHash` (a content hash at that moment). **Dirty** is
`contentHash(draft) !== hostSyncedHash` — a real comparison, so an edit that is
undone reads as clean again.

On `mkp:load` with a `hostId`:

| local draft | server copy | result |
|---|---|---|
| none | — | create a draft from the payload and open it |
| clean | not newer | reuse the draft as is (keeps checkpoints) |
| clean | newer (`updatedAt` > `hostSyncedAt`) | replace the draft's content with the payload |
| dirty | not newer | resume the draft silently |
| dirty | newer | ask: **Resume my draft** / **Use CharSnap's version** |

On `mkp:load` with `hostId: null` (a new book): if an unsaved, non-empty draft
of a previous new book exists, ask **Resume draft** / **Discard it and start
fresh**; otherwise start an empty draft. The first `mkp:saved` for it stamps the
`hostId` the host assigned.

The content hash covers: name, every entry's `name / entryType / triggers /
description / isPublic / disabled / folderId` in order, folders minus their
`collapseState`, and `allowedOverlaps`. Builder ids, timestamps, checkpoints and
limit-warning flags are excluded, so a book that comes back from the host
hashes the same as the copy that was saved.

## Save, reject, conflict

1. The builder validates first (see *Limits*). Problems are shown in a banner
   with the first offending entry scrolled into view and expanded; nothing is
   posted.
2. Otherwise it posts `mkp:save`, remembers the content hash it sent, and locks
   the Save button for up to 15 s.
3. `mkp:saved` stamps `hostId`, `hostSyncedAt = updatedAt` and
   `hostSyncedHash` = the hash captured at post time (so edits made while the
   save was in flight correctly remain dirty).
4. `mkp:save-rejected` shows the host's `errors` the same way as local
   validation.
5. `mkp:save-failed { reason: 'conflict' }` opens a dialog:
   - **Overwrite CharSnap** re-posts the same content with `force: true`. The
     host should skip its optimistic-concurrency check for a forced save.
   - **Reload from CharSnap** posts `mkp:request-load {}`. The host re-fetches
     the lorebook and answers with a fresh `mkp:load` for the same `hostId`
     (newer `updatedAt`). The local draft is dirty and the server copy is
     newer, so the load semantics above offer *Resume my draft / Use
     CharSnap's version*.
   - **Keep editing** closes the dialog; the draft stays dirty.
6. Any other `mkp:save-failed` shows the `message` in the footer.

## Limits

The builder validates before posting and hard-caps typing at:

| field | limit |
|---|---|
| lorebook name | 1–50 characters (`index: -1`) |
| entry name | 1–50 characters |
| triggers | 1–25, none blank |
| description | 1–1500 characters |
| `entryType` | one of the five labels |

Hidden (`disabled`) entries are validated too. The `errors` shape is the same
whether the builder or the host produced them.

Inbound payloads over 4 MB of JSON are refused with `mkp:error`.

## Local storage behaviour

- Drafts persist exactly like standalone books (`mkp_lorebook_*`), with the
  four host fields added on host-bound books only. They survive reloads, so a
  closed tab loses nothing.
- If the library cap (50 books) or the storage quota is hit, the oldest
  **clean** host draft is evicted to make room. If nothing can be evicted the
  draft is kept in memory only and the footer says so; saving to the host still
  works.
- Theme tokens from `mkp:theme` are never written to `mkp_settings`. A user who
  picks a theme in Settings overrides the host's palette for that session only.

## Running the harness

`verify/host-harness/index.html` is a static host page: an iframe pointing at
the builder, a message log, and buttons for every host → iframe message
(load sample / newer copy / new book, theme, set-name, request-save, and the
three save replies). **Auto-answer request-load** makes it reply to
`mkp:request-load` with the newer copy, the way a real host would. It validates `event.origin` and `event.source` the way a
real host must.

```bash
npm run dev                          # builder on http://localhost:5173
npx serve -l 3000 verify/host-harness   # any static server on port 3000
# open http://localhost:3000/?builder=http://localhost:5173/?host=charsnap
```

Port 3000 matters: the harness's origin has to be on the builder's allowlist.

The automated version — `verify/host-checks.mjs` — serves the same file by
intercepting `http://localhost:3000/**` with Playwright's `page.route`, so it
needs no second server:

```bash
npm run verify -- host     # the host scenarios only
npm run verify             # everything, including the pure checks in
                           # verify/host-serialize-checks.mjs
```
