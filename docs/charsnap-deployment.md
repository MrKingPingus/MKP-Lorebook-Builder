# MKP Lorebook Builder

A browser-based tool for building and managing lorebooks for AI chatbots. No install, no account — open it and start writing.

**[Try the live version](https://mrkingpingus.github.io/MKP-Lorebook-Builder/)** — the app running on GitHub Pages, to look at before deploying anything.

![MKP Lorebook Builder](BuildPage.png)

---

## Deployment Quickstart

```bash
npm install
npm run build
```

That produces a `dist/` folder. **Copy it wherever it should live and serve it as static files. That's the whole deployment.**

The build prints an informational note that some chunks are over 500 kB. That's expected — there are two, the app itself and the DOCX parser. The parser is split into its own file so it's only downloaded if someone actually imports a Word document; it never loads on a normal page view.

Things worth knowing before you wire it up:

- **It can live at any path.** Assets are referenced relatively, so `dist/` works at `/lorebook-builder/`, `/extensions/lorebook/`, or a domain root without rebuilding or reconfiguring anything.
- **There is no server component.** No backend, no database, no API keys, no environment variables, no build-time configuration. Static file hosting is the only requirement.
- **Lorebook content stays in the browser.** Every lorebook is stored in the visitor's own `localStorage`. No lorebook is ever transmitted anywhere, and there is no analytics or telemetry of any kind. Two optional features do make outbound requests — see [Network Activity](#network-activity) below.
- **Requires Node 20.19+ or 22.12+** to build (a Vite 7 constraint). Nothing is needed on the server at runtime.
- **Nothing to purge between builds.** Asset filenames are content-hashed, so a rebuild is a straight replacement.

To sanity-check the built output before deploying it:

```bash
npm run preview     # serves dist/ on http://localhost:4173
```

---

## What It Does

<details>
<summary><strong>What's a Lorebook?</strong></summary>

A lorebook is a set of keyword-triggered context entries handed to a chatbot. When one of an entry's trigger words appears in conversation, that entry's text gets injected into the model's context — so the character "knows" about a place, item, person or event without it having to sit in the system prompt permanently.

</details>

Entries carry a name, a type, trigger keywords and a description. The app handles authoring, organising, searching and exporting them:

- **Entry types** — Character, Item, Plot Event, Location, Other, colour-coded down the entry's left border
- **Trigger management** — up to 25 per entry, added one at a time, pasted as a comma-separated list, or assembled from the description with the Phrase Builder
- **Crosstalk detection** — flags when two entries share a trigger, with an "allow" option for deliberate overlaps
- **Folders** — group entries, nest up to three levels, drag to reorder or refile
- **Search and filter** — live filtering across names, triggers and descriptions, with find-and-replace across the whole book
- **Suggestions** — auto-generated trigger keywords derived from an entry's name, type and description
- **Up to 50 lorebooks** stored independently, each with its own name, entries and undo history
- **Import / export** — JSON, TXT and DOCX in both directions, with blank templates for authoring outside the app

The interface, as of 0.11.0:

- **The lorebook title is a menu** — saved books on one side, import and export on the other; switch, create, rename, delete or download without leaving the header
- **A status bar along the bottom** carries the readouts: save state, entry count, storage use, feedback links and the running version
- **A pull tab on the right edge** opens the lorebook list by *widening* the window, so nothing you were reading gets covered
- **One `⤢ Size` menu** for window size, text size, entry height and **+** button size, each with a saveable default
- **Settings is filterable** — four sections, with a search box that matches beyond the visible labels
- **Reference lorebooks** — pair a second book to compare triggers against, chosen from one picker reachable from the title menu, a book's **⋯** menu, the hotbar, the Lorebooks panel or Settings
- **A `⋯` menu on every entry** gathers the per-entry actions — copy or move the entry to another lorebook, file it in a folder, save it as a reusable template or fill it from one, publish/hide it, delete it — all reachable without opening the entry
- **Entry templates**, stored globally and shared by every lorebook: save an entry as a scaffold, then fill an existing entry or start a new one from it, choosing which of its fields to apply
- **Select mode** condenses entries to name-and-checkbox (about 4× as many on screen) and collects its bulk operations into a single **Actions** menu
- **Usable on a phone** — the whole touch layout was reworked in 0.10.0: a 44px minimum tap target throughout, the title menu reachable from the phone header, filter controls on one row, and the hotbar clear of Safari's address bar on iOS
- **A guided tour** highlights controls in the live app one at a time, running on its own sample books that are never written to storage

A full walkthrough of every feature is in the [user guide on the source repository](https://github.com/MrKingPingus/MKP-Lorebook-Builder#readme).

---

## Embedding / host mode

The builder can also run inside an `<iframe>` on a site that owns the lorebook's
storage — the way it is embedded on CharSnap. Open it with `?host=charsnap` in a
frame and it fills the frame, skips the landing page, takes its theme from the
host, and saves through the host over `postMessage` instead of downloading a
file. The standalone app is unaffected: the flag does nothing at top level.

The full protocol — message names, the entry wire shape, `builderMeta`, the
dirty/conflict rules, limits, and how to run the harness — is in
[HOST-MODE.md](HOST-MODE.md). `public/_headers` carries the matching
`frame-ancestors` policy for Cloudflare Pages.

---

## Network Activity

Full disclosure of everything the deployed app can request, so there are no surprises in a CSP or a privacy review.

**At page load: nothing.** No analytics, no telemetry, no beacons, no third-party scripts. The app boots entirely from its own bundle.

**On demand**, two optional features call out:

| Feature | Host | Sends | If it fails |
|---|---|---|---|
| Synonym popover on a suggestion chip | `api.dictionaryapi.dev` | The single word being looked up | Popover reports the lookup failed; nothing else is affected |
| Related-word suggestions | `api.datamuse.com` | The single word being looked up | Same — handled, non-fatal |

Both are free, keyless APIs, triggered only by direct user interaction, and send **one word at a time** — never entry text, descriptions or lorebook content. Results are cached for the session. Both are already disclosed to end users in the app's own Settings panel, and every request is wrapped in error handling that degrades to "unavailable" rather than breaking.

If your platform's policy doesn't allow either host, the synonym and related-word features can be removed by deleting `src/services/thesaurus-service.js` and its two call sites — no other functionality depends on them. Say the word and I'll prepare that variant.

**No runtime CDN dependencies.** Everything the app needs is in the bundle you build. The DOCX parser is bundled and code-split rather than fetched from a CDN, so Word import works offline and behind restrictive network policies, and your deployment never executes third-party JavaScript from a host outside your control.

---

## Compatibility

| | |
|---|---|
| **Runtime dependencies** | None — static files and a browser |
| **Build dependencies** | Node 20.19+ / 22.12+, npm |
| **Language** | JavaScript (React 18 + Vite 7) |
| **Network calls at runtime** | None on load; two optional keyless lookups on user action ([details](#network-activity)) |
| **Storage** | Browser `localStorage` only |
| **Bundle size** | ~188 KB gzipped (JS) + ~23 KB gzipped (CSS) on load, plus a ~131 KB gzipped DOCX-parser chunk fetched only on Word import |

---

## Local Development

Only needed if you want to modify the app — deploying it doesn't require any of this.

```bash
npm install
npm run dev
```

`npm run dev` prints a local address — usually **http://localhost:5173**. Edits to files under `src/` reload in the browser instantly. **Ctrl+C** stops the server.

| Command | What it does |
|---|---|
| `npm install` | Downloads dependencies. Run once after cloning, and again whenever `package.json` changes. |
| `npm run dev` | Development server with hot reload, port 5173. |
| `npm run build` | Production bundle into `dist/`. |
| `npm run preview` | Serves `dist/` on port 4173. Run `npm run build` first. |
| `npm run verify` | Automated browser checks — see below. |

### Automated checks

`npm run verify` drives the real app in a headless browser to check features end to end. It needs a Chromium build Playwright can find, which is a one-time extra install:

```bash
npx playwright install --with-deps chromium
npm run verify
```

A full run launches a fresh browser per scenario and takes several minutes. To run a slice of it, pass a name substring:

```bash
npm run verify -- folders
```

`verify/README.md` covers what the suite checks.

### Code layout

```
src/
  components/   React components — rendering only
  hooks/        component-facing logic
  services/     plain JS, no React
  state/        Zustand stores
  constants/    shared values, no hardcoded literals in logic files
```

Imports flow in one direction only: `constants → services → hooks → components`. Components reach state and services through hooks rather than importing them directly, and `storage-service.js` is the only file that touches `localStorage`.

---

## License

MIT — see [LICENSE](LICENSE).
