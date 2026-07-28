# MKP Lorebook Builder

A browser-based tool for building and managing lorebooks for AI chatbots. No install, no account — open it and start writing.

**[Launch the app](https://mrkingpingus.github.io/MKP-Lorebook-Builder/)**

![MKP Lorebook Builder](BuildPage.png)

---

<details>
<summary><strong>What's a Lorebook?</strong></summary>

<!-- paste explanation here -->

</details>

---

## Getting Started

Open the link above... That's it! There's nothing to install or sign in to, so you can just start getting to work by either starting a fresh book or importing an existing one. Your work saves automatically to your browser's local storage as you go, so closing the tab won't lose anything! (But clearing the cache on the host page WILL, so make sure your work is hard saved before doing such a thing or *you **will** cry*.

The entire interface lives inside a single floating window. You can drag it around by its header and resize it from any corner. If it gets out of hand, the Settings tab has a button to snap it back to the default size. Whatever size you set it to will persist from session to session!

---

## Building a Lorebook

### Naming Your Lorebook

Click the lorebook name field in the title bar and type. The name saves automatically.

### Adding Entries

Click the **+** button at the bottom of the window, or press **Alt+N** (configurable in Settings). New entries appear at the bottom of the list.

### Entry Anatomy

Each entry has four parts:

- **Name** — a label for your own reference. Not used by the AI directly.
- **Type** — one of five categories, color-coded on the entry's left border (Types are mostly just for personal organization. As of now, JSON files uploaded to CharSnap won't carry the Entry Type with them. Just something to be aware of!):
  - Purple — Character
  - Blue — Item
  - Red — Plot Event
  - Yellow — Location
  - Teal — Other
- **Triggers** — These are the keywords that the LLM is using to decide to pull from the Lorebook. These are not case sensitive, plural/singular sensitive, or possessive sensitive. You want these to be words that, when they appear in chat, they call upon this entry for context. The contents of user's last message and char's message before that are used for these triggers to determine char's next response. Try not to use the same keywords for more than a handful of entries. Each trigger is its own chip. You can add them one at a time, paste a comma-separated list to add several at once, or use the Phrase Builder to click words together from the entry's description. Up to 25 triggers per entry.
- **Description** — This is the meat of the entry. Generally, you want to keep this concise. Character limit is 1500 for each entry, but it's recommended to keep it around 500, especially because so many entries can be pulled at one time. Some examples of entries can be: character sheets for NPCs, rules of the universe, setting, creatures/monsters, food/drink, etc. The character counter color will change as you approach the limit (thresholds are adjustable in Settings, though stock settings are recommended).

### Trigger Crosstalk

If two or more entries share the same trigger, the conflicting chips are flagged with a warning ring. Hovering the chip opens a popover listing which other entries share it. You can click **Allow** to mark the overlap as intentional — the ring turns blue to confirm it — or **Revoke** to restore the warning.

### Reordering Entries

Drag any entry card up or down to reorder.

### Suggestions

Each entry has a collapsible **Suggestions** tray. Open it to see up to 12 auto-generated trigger keyword suggestions based on the entry's name, type, and description. Click any suggestion to add it as a trigger, or hit the reroll button to generate a fresh batch.

  - **Phrase Builder**

Inside the Suggestions tray, the **Phrase Builder** lets you click words from the description to assemble a multi-word trigger phrase in order. Confirm to add it as a single trigger chip.

### Undo / Redo

Every change to your entries is tracked. Use **Ctrl+Z** to undo and **Ctrl+Y** to redo, up to 50 steps back. Both hotkeys are configurable in Settings. (Currently a tad overzealous)

---

## Managing Multiple Lorebooks

The lorebook switcher lives in the menu panel (accessible from the header). You can save up to 10 lorebooks independently. Each has its own name, entries, and history. Switch between them at any time — your current lorebook autosaves before switching!

To delete a lorebook, open the switcher and hit the delete button next to it. **This cannot be undone**.

---

## Search & Filter

### Search

The search bar filters the entry list in real time across entry names, triggers, and descriptions. Matches are highlighted in yellow inside description fields. The match counter shows how many total matches exist across how many entries. At the very end of tbhe search bar is a button for selecting *how* you'd like to sort your search. You have Default, A-Z, Z-A, and Last Modified. *(Last Modified is great for keeping track of non-linear workflows!)*

Below the search bar, a **Find & Replace** row lets you do a bulk text replacement across every trigger and description field in the lorebook at once.

### Filter by Type

The type filter bar lets you narrow the entry list to one or more types. Click a type pill to toggle it. Active filters stack — you can show Characters and Locations at the same time, for example.

---

## Import & Export

### Import

Open the **Import / Export** tab and drop a file onto the drop zone, or click to browse. Supported formats: **JSON**, **TXT**, and **DOCX**.

After loading a file, a preview of the parsed entries appears before anything is committed. You can choose to:
- **Replace** the current lorebook's entries with the imported ones
- **Load into a new lorebook slot** so your current work stays intact

If your current lorebook has unsaved-to-file changes, the importer will offer to export it first before proceeding.

The **Append** import (available via the hotbar) lets you drop a file and add its entries to the current lorebook without replacing anything.

### Export

- **Download JSON** — the full lorebook as a `.json` file
- **Download TXT** — a plain-text block format
- **Download DOCX** — a Word-compatible document
- **Copy JSON** — copies the full JSON directly to your clipboard

**Templates** — download a blank TXT or DOCX file pre-formatted for import, useful if you want to write entries by hand outside the app.

---

## Settings

Open the **Settings** tab to configure:

| Setting | What it does |
|---|---|
| Suggestions collapsed by default | Starts every entry's suggestion tray closed |
| Hide entry stats badges | Hides the trigger count and character count in entry headers |
| Tiered counter colors | Color-codes character counters green → yellow → red by threshold |
| Character count thresholds | Set where yellow and red kick in |
| Default window size | The size the window resets to |
| FAB button size | Size of the + button (small / medium / large / custom) |
| Hotbar slots | Assign actions to the 6 slots flanking the + button (3 per side) |
| Hotkey bindings | Change the key for new entry (Alt+?), undo (Ctrl+?), and redo (Ctrl+?) |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Alt+N | New entry (key configurable) |
| Ctrl+Z | Undo (key configurable) |
| Ctrl+Y | Redo (key configurable) |

---

## Running It Yourself

You don't need to do any of this to *use* the app — the link at the top is the whole product. This section is for anyone who wants to run it on their own machine or host their own copy.

### What you need first

- **[Node.js](https://nodejs.org/)** — version **20.19 or newer**, or **22.12 or newer**. Vite 7 won't run on anything older. Check what you have with `node --version`.
- **npm** — comes bundled with Node, nothing extra to install.
- **[Git](https://git-scm.com/)** — only needed for the clone step. You can also download the repo as a ZIP from GitHub and skip it.

There is no database, no server, and no API key to set up. Nothing to configure before the first run.

### Getting it running

```bash
git clone https://github.com/MrKingPingus/MKP-Lorebook-Builder.git
cd MKP-Lorebook-Builder
npm install
npm run dev
```

`npm run dev` prints a local address — usually **http://localhost:5173** — open that in your browser and the app is live. Edits to files under `src/` reload in the browser instantly.

Press **Ctrl+C** in the terminal to stop the server.

### The other commands

| Command | What it does |
|---|---|
| `npm install` | Downloads dependencies into `node_modules/`. Run once after cloning, and again whenever `package.json` changes. |
| `npm run dev` | Starts the development server with hot reload on port 5173. This is the one you want day to day. |
| `npm run build` | Compiles a production bundle into `dist/`. That folder is plain static files — it can be hosted anywhere. |
| `npm run preview` | Serves the contents of `dist/` on port 4173 so you can check the real production build. Run `npm run build` first. |
| `npm run verify` | Runs the automated browser checks. Optional — see below. |

### Where your data lives

Everything you create runs entirely in your browser and is stored in that browser's `localStorage`. Nothing is uploaded anywhere and no account exists. A local copy keeps its own separate storage from the hosted version, so lorebooks you made on the live site won't appear in your local one — move them across with Export and Import.

### Running the automated checks (optional)

`npm run verify` drives the real app in a headless browser to check features end to end. It needs a Chromium build that Playwright can find, which is a one-time extra install:

```bash
npx playwright install --with-deps chromium
npm run verify
```

A full run launches a fresh browser per scenario and takes several minutes. To run just a slice of it, pass a name substring:

```bash
npm run verify -- folders
```

See `verify/README.md` for what the suite covers.

### Hosting your own copy

Push to `main` and `.github/workflows/main.yml` builds the app and deploys it to GitHub Pages. Two things to know:

1. **Pages has to be turned on first.** In your repository, go to **Settings → Pages** and set the source to **GitHub Actions**. Until you do, the workflow runs, notices Pages is off, and exits cleanly without deploying — so a green check doesn't necessarily mean a live site.
2. **The base path takes care of itself.** `vite.config.js` reads the repository name from the Actions environment, so the build works under `https://<user>.github.io/<repo-name>/` no matter what the repository is called. You don't need to edit anything after forking or renaming.

For any other host, run `npm run build` and upload the `dist/` folder. It's static — no Node runtime required on the server.
