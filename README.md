# MKP Lorebook Builder

A browser-based tool for building and managing lorebooks for AI chatbots. No install, no account — open it and start writing.

**[Launch the app](https://mrkingpingus.github.io/MKP-Lorebook-Builder/)**

<!-- screenshot placeholder -->

---

<details>
<summary><strong>What's a Lorebook?</strong></summary>

<!-- paste explanation here -->

</details>

---

## Getting Started

Open the link above. That's it — there's nothing to install or sign in to. Your work saves automatically to your browser's local storage as you go, so closing the tab won't lose anything.

The entire interface lives inside a single floating window. You can drag it around by its header and resize it from any corner. If it gets out of hand, the Settings tab has a button to snap it back to the default size.

---

## Building a Lorebook

### Naming Your Lorebook

Click the lorebook name field in the title bar and type. The name saves automatically.

### Adding Entries

Click the **+** button at the bottom of the window, or press **Alt+N** (configurable in Settings). New entries appear at the bottom of the list.

### Entry Anatomy

Each entry has four parts:

- **Name** — a label for your own reference. Not used by the AI directly.
- **Type** — one of five categories, color-coded on the entry's left border:
  - Purple — Character
  - Blue — Item
  - Red — Plot Event
  - Yellow — Location
  - Teal — Other
- **Triggers** — the keywords that cause the entry to activate. Each trigger is its own chip. You can add them one at a time, paste a comma-separated list to add several at once, or use the Phrase Builder to click words together from the entry's description. Up to 25 triggers per entry.
- **Description** — the lore text injected when a trigger fires. Capped at 1500 characters. The character counter color-codes as you approach the limit (thresholds are adjustable in Settings).

### Reordering Entries

Drag any entry card up or down to reorder.

### Suggestions

Each entry has a collapsible **Suggestions** tray. Open it to see up to 12 auto-generated trigger keyword suggestions based on the entry's name, type, and description. Click any suggestion to add it as a trigger, or hit the reroll button to generate a fresh batch.

### Phrase Builder

Inside the Suggestions tray, the **Phrase Builder** lets you click words from the description to assemble a multi-word trigger phrase in order. Confirm to add it as a single trigger chip.

### Undo / Redo

Every change to your entries is tracked. Use **Ctrl+Z** to undo and **Ctrl+Y** to redo, up to 50 steps back. Both hotkeys are configurable in Settings.

---

## Managing Multiple Lorebooks

The lorebook switcher lives in the menu panel (accessible from the header). You can save up to 10 lorebooks independently. Each has its own name, entries, and history. Switch between them at any time — your current lorebook autosaves before switching.

To delete a lorebook, open the switcher and hit the delete button next to it. This cannot be undone.

---

## Search & Filter

### Search

The search bar filters the entry list in real time across entry names, triggers, and descriptions. Matches are highlighted in yellow inside description fields. The match counter shows how many total matches exist across how many entries.

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

## Local Development

```bash
npm install
npm run dev      # dev server with hot reload
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

The app deploys automatically to GitHub Pages via `.github/workflows/main.yml` on push to `main`.
