# Changelog

---

## 0.11.0 — Unreleased

### New

- **The builder can be embedded in CharSnap.** Opened inside a frame with `?host=charsnap`, it fills the frame, takes CharSnap's theme, and saves with one **Save to CharSnap** button (or **Ctrl+S** / **⌘S**) instead of downloading a file — CharSnap does the storing, the builder keeps your draft, undo history and checkpoints in your browser as it always has. A dot on the button and a line in the footer say when there is something unsaved; if the copy on CharSnap moved on while you were editing, you are asked which one to keep rather than having either overwritten. Entries hidden from export are saved as *disabled* — still in the book, never fired in chat. Opening the same URL on its own does nothing special: the standalone app is untouched. The full protocol is in `HOST-MODE.md`.

- **Every per-entry action now lives in a ⋯ menu on the entry's header** — and works without opening the entry. **Copy to lorebook**, **Move to lorebook**, **Move to folder**, **Templates**, **Public on CharSnap**, **Hide from Export** and **Delete entry** are all one click from a collapsed entry. The first three open a submenu beside the menu when you hover them — the way the sizing menu in the status bar already works — so you can read down the list of folders or lorebooks without losing sight of everything else the menu offers, and switch between them without clicking at all. Most of them used to be spread across a footer that only an expanded entry shows, so acting on an entry while skimming meant expanding it first. **Remove** is gone from the header; it is **Delete entry** at the bottom of the menu, and **Ctrl+Z** still brings the entry back. Checkpoints stay in the entry itself, where their panel opens.

- **Entry templates.** Save any entry as a reusable scaffold and drop it into another one — from an entry's **⋯ → Templates**, or, in a lorebook with nothing in it yet, from the **start from a template** link where the entry list would be. Templates are shared by every lorebook, so a character sheet you set up once is there in every book you open afterwards.

  Saving is one press and asks nothing: the whole entry goes in, so a template without a title is one you saved from an entry without a title. Loading is where you choose — pick a template and you get a checklist of **only the fields it actually has something in**, and two ways to use it: **Fill this entry**, or **New entry from this**. A template that only has a description skips the checklist entirely and goes straight in. Triggers are added to whatever the entry already has rather than replacing them, so a `name / alias / nickname` scaffold extends your list instead of wiping it. If the entry already has a description, you're asked whether to **append** or **overwrite** — and either way, the whole fill is a single **Ctrl+Z** away.

  Templates file into categories, which nest. Sort them from the same menu's **Manage** mode, or from **Settings → Editing & Entries → Templates** for the bigger jobs like moving templates between categories. Deleting a category never deletes what's in it — its templates go back to Uncategorized and any sub-categories move up a level. ([#114](https://github.com/MrKingPingus/MKP-Lorebook-Builder/issues/114))

- **Entries can be copied or moved to another lorebook.** Put a duplicate somewhere else, or send an entry that landed in the wrong book to the right one — from an entry's ⋯ menu, or from the selection bar's **To Lorebook…** for a whole batch at once. The entry arrives with its name, type, description, triggers, its Public and Hide-from-Export settings, **and its checkpoints**; folders don't come along, since folders belong to the book they were made in. If the book you want doesn't exist yet, **＋ New lorebook…** makes it and names it on the spot without moving you out of the book you're working in — and once the transfer lands, the menu tells you where it went and offers to take you there. Moving asks first, because undo works on the book you moved *out of*: it brings the entry back here without removing the copy it made over there. ([#127](https://github.com/MrKingPingus/MKP-Lorebook-Builder/issues/127))

- **Warning colours come in three scales now** — Settings → Appearance & Accessibility → **Warning color scale**. **Three colors** is the green / yellow / red you already have, and stays the default. **Four colors** adds orange between them, which frees red to mean *at the limit* rather than *getting long* — so you can keep a warning at 1000 characters and still be told when you cross 1500, instead of choosing between them. **Gradient** drops the steps entirely — green, easing into yellow as it nears your first threshold, then on through orange to red, with no edges anywhere. The green hand-off scales with your own thresholds rather than being a fixed run of characters, so it sits two thirds of the way to your first one (at the default, that means solid green to 500 and a fade over the last 250). Whichever you pick applies everywhere at once — description and trigger counters, the entry title counter, the coloured field borders, and the storage ring. ([#131](https://github.com/MrKingPingus/MKP-Lorebook-Builder/issues/131))
- **A third character threshold**, on the four-colour and gradient scales. Your existing two numbers keep the meanings they had — the second one just paints orange instead of red — and the new third one sits above them at the character limit. Switching scales never moves a threshold you set.
- **An entry tells you when its content is newer than its latest checkpoint** — a small yellow dot on the entry's **Checkpoints** button. It appears once you've edited the entry past the last checkpoint saved for it, and clears the moment you save or overwrite one. This is the job the save prompt used to do by interrupting you: the same information, sitting where you'd look for it, asking nothing.

### Improved

- **Collapsing an entry no longer asks you anything.** It used to stop and ask whether to save a snapshot first, with **Save New**, **Replace Latest** and **Skip** to choose between. Collapsing is a view control — your writing is saved continuously whether an entry is open or shut, and nothing was ever at risk — so the question was raising an alarm about a danger that didn't exist, at a moment you'd chosen for an unrelated reason. Entries now simply collapse. In the default mode a checkpoint is still saved automatically before your first edit of each session, exactly as before. ([#132](https://github.com/MrKingPingus/MKP-Lorebook-Builder/issues/132), [#133](https://github.com/MrKingPingus/MKP-Lorebook-Builder/issues/133))
- **The Enable checkpoints button on an entry now enables them.** It used to throw you into Settings — and not even to the right setting, just to the panel, to find the switch yourself. Pressing it turns checkpoints on for the lorebook and opens the entry's Checkpoints panel so you can see what you got. How many to keep, and whether the first edit of a session saves one automatically, are still in Settings → Editing & Entries for when you want them.
- **Entry History is now Entry Checkpoints, and a snapshot is a checkpoint.** One word throughout — the button on the entry, the panel it opens, and the Settings block — where the feature previously answered to "Entry History" in some places and "Snapshots" in others. "Checkpoint" is the word this kind of save-point already goes by in the tools this builder sits alongside, and unlike "history" it names a thing you can point at, count, and restore.
- **Replace Latest moved into the Checkpoints panel, as an overwrite on each checkpoint.** Every checkpoint in the list now carries a **⟳** that replaces its contents with the entry as it stands, keeping its label, its pin and its place in the list. As a prompt button it was a storage question sprung on you at collapse time; as a row action it's a deliberate choice about a checkpoint you can see.
- **Settings for how the builder looks now live together.** The counter colours, character thresholds, entry stats badges, condensed-row stats and the private-entry marker moved from **Editing & Entries** to **Appearance & Accessibility**, under two new headings — **Warnings & counters** and **Entry display**. Editing & Entries had grown to hold nearly half of Settings while Appearance held three things, and the split follows a simple line: settings that change what happens stay with editing, settings that only change what you see moved. Searching Settings finds them wherever you look for them.
- **Every dropdown in Settings is now a full-size tap target on a phone.** They were 31px against a 44px floor.

### Fixed

- **Copying entries to the reference lorebook survives closing the tab.** With two books side by side, **Copy to Reference** — and the same push from a phone — only ever held the copy in memory. It was written out the next time you happened to open that book, so it looked fine, right up until you closed the tab first and it was gone.
- **The description box's coloured border now follows your own thresholds.** It was reading the built-in 750 / 1000 defaults no matter what you'd set, so anyone who moved their thresholds had a counter and a border disagreeing about when an entry was getting long.
- **The synonyms popover no longer appears on its own after you accept a suggested trigger.** Clicking a suggestion removes its chip, and the remaining chips slide over to close the gap — sliding a different one under a cursor that hadn't moved. The app read that as you hovering it and opened the synonyms popover for a word you never pointed at, a moment after you'd clicked. Which chip landed under your cursor decided whether it happened at all, which is why it seemed random. Hovering a chip on purpose works exactly as before. ([#130](https://github.com/MrKingPingus/MKP-Lorebook-Builder/issues/130))
- **Deleting a checkpoint can be undone.** It wrote straight through with no undo step, so a misclicked **×** destroyed a saved checkpoint permanently. Both deleting and overwriting a checkpoint now record an undo step and come back with **Ctrl+Z**.
- **`.odt` is no longer offered as an import format.** It was accepted by the file picker and then handed to the Word (`.docx`) reader, which cannot open an OpenDocument file, so every attempt failed with an unhelpful error. The picker now lists TXT, DOCX and JSON, and an `.odt` dropped in anyway gets a message that says to save it as `.docx` or `.txt` first.
- **Downloads no longer race their own cleanup.** The export helper revoked the blob URL in the same tick as the click that started the download; browsers that resolve the URL a moment later could end up with an empty file. The revoke is now deferred past the click.
- **TXT and DOCX imports cap triggers at 25** like the JSON importer already did, so an over-long trigger line in a text file no longer produces an entry the builder itself flags as over the limit.
- **Comments and the README said the library holds 10 lorebooks**; the cap has been 50 since it was raised. The text now matches the constant.

### Under the hood

- **Host mode is a fourth verify layer.** `verify/host-checks.mjs` drives the embedded builder from a static host page (`verify/host-harness/index.html`) served through Playwright's request interception, so the postMessage handshake, the origin checks on both sides, the save round trip, conflict handling and draft resume are all exercised against the real app with no second server. `verify/host-serialize-checks.mjs` covers the wire mapping, content hash and validator in-process. `npm run verify -- host` runs the suite alone; a filter that matches nothing in one suite no longer fails the run, only one that matches nothing anywhere.
- **`public/_headers`** sets `Content-Security-Policy: frame-ancestors` for the CharSnap origins, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Cache-Control: no-cache` on the HTML shell. Script and connect directives are a later step.

- **The per-entry `⋯` menu is a new component** (`components/feature/EntryActionsMenu.jsx`), portalled and anchored because the entry list clips on overflow. It follows its button through a scroll rather than closing, which the other anchored popovers can get away with only because they hang off chrome that never scrolls. `MoveToFolderButton.jsx` and its CSS are deleted — the menu's folder submenu replaces it.
- **Flyout submenus are one component now** (`components/ui/Flyout.jsx`), lifted out of `ScaleMenu.jsx`, which had the only implementation. It measures itself rather than guessing, so a panel whose size depends on its contents still opens right and flips left only when the viewport has no room.

- **Warning colours are computed in one place** (`services/warning-color.js`) instead of a green/yellow/red conditional hand-copied into seven call sites across six components — which is how the description border came to disagree with its own counter. Adds an `--orange` token to the dark, light and high-contrast palettes; a custom theme inherits it. Gradient blends go through `color-mix(in oklab, …)` on the theme's own tokens, so every palette fades through its own colours. Covered by 47 pure-logic checks in `verify/warning-color-checks.mjs` and a browser scenario, most of them guarding one promise: switching scales must never move a threshold a user already set.
- **Entry Templates are a global `mkp_templates` localStorage key**, outside every lorebook — with `services/template-service.js` (pure) behind `hooks/use-templates.js`, which writes through on every mutation because autosave only ever persists the active lorebook. `services/category-tree.js` is new: the pure tree over `{id, parentId}` nodes that entry folders and template categories now share, with the depth cap as a parameter rather than a constant. `folder-tree.js` binds it and kept a byte-identical public API, so its 154 checks held the refactor unedited. 42 new pure-logic checks plus three browser scenarios.
- **Copy/move between lorebooks is one service** (`services/entry-transfer.js`, pure) behind one hook (`hooks/use-entry-transfer.js`), shared by the ⋯ menu and the bulk bar. Every write to a book that is not the active one now calls `saveLorebook` itself — autosave only ever persists the active book, which is what the reference-copy fix above turned out to be about. `cloneEntry` gained `keepSnapshots` / `keepModified` rather than changing under its existing callers. 28 pure-logic checks in `verify/entry-transfer-checks.mjs` plus three browser scenarios, two of which reload the page, because a transfer that only reached the store would otherwise pass everything.
- **The checkpoints system has behavioural test coverage for the first time**, in `verify/checks.mjs` — it had none at all before, despite owning saved user content. The scenario drives the real app through enabling checkpoints, editing, collapsing, and overwriting.
- **Code identifiers still say `rollback` and `snapshots`.** The user-facing rename stopped at the UI deliberately: the per-book config key and the per-entry array are persisted in `localStorage` under those names, so renaming them in place would orphan every checkpoint already saved in a browser. A later identifier rename should cover files, hooks and CSS classes and stop short of the stored schema.

---

## 0.10.0 — 2026-08-14

### New

- **On a phone, your lorebook's name now sits in the title bar** — the same place it lives on a desktop, and the same button. It used to have a row of its own below the search and filter controls, which meant meeting the filters before the book they filter. The **LOREBOOK BUILDER** wordmark steps aside to make room; the logo stays.
- **Selecting entries shows them condensed** — just the name and a checkbox, with the entry type still shown as the colour down the left edge. About four times as many fit on screen. Settings → Editing & Entries → **Show full entry cards while selecting** brings the full cards back.
- **Tap your lorebook's name on a phone to open the lorebook menu** — it now wears the same outlined style the title has on a desktop, so it reads as something you press rather than a caption. Two tabs — every book you've saved, and import/export — the same two destinations the title menu has always offered on a desktop. Switch books, start a new one, rename or delete any of them, download a copy or grab a template. On a phone none of that was reachable before: the header gear goes straight to Settings, and every other route into those screens was desktop-only.
- **A reference lorebook chooser, in one place, reached from anywhere.** It shows what's paired now, what you can pair instead, and — because this is the moment you're likely asking — a line explaining what a reference lorebook actually does. Open it from the lorebook menu, a book's **⋯** menu, the hotbar's **Reference** button, the Lorebooks panel, or Settings.
- **Settings has a way back to the landing page**, at the bottom. On a phone this was previously unreachable without reloading, which meant no route to **New lorebook**, your recent books, **What's new** or **Learn** once you were in the builder.

### Improved

- **The tour walks you through the app itself now, instead of showing you pictures of it.** It highlights one control at a time and explains it where it actually sits — and you can **tap the highlighted thing**, which really does what it normally does, with the tour following you into it. On a phone the old screenshots were the problem: a picture of a desktop window inside a phone-width panel came out at roughly a fifth of life size, *Click to enlarge* gained almost nothing, and turning your text size up pushed **Next** off the bottom of a panel that couldn't scroll. The tour runs on a small sample lorebook of its own, so nothing of yours is touched, and puts you back in your own book when you're done. Because this release only changed the phone layout, the tour is only offered on a phone — a desktop gets one again the first time there's something desktop-shaped to show.
- **Pairing a reference lorebook is the whole feature now — there's no separate switch to find first.** A book is paired or it isn't. Previously you turned on "Show reference panel" in Settings and then had to find a picker in a different panel; on a phone that panel couldn't be opened at all, so turning the setting on did nothing visible and nothing said why. ([#123](https://github.com/MrKingPingus/MKP-Lorebook-Builder/issues/123))
- **The hotbar's Reference button opens the chooser** instead of flipping a mode and leaving you to find the picker. It lights up when a book is genuinely paired, not merely when a mode is on. **Alt+R** does the same.
- **Pairing is spelled out in words** — **Pair as reference** in each book's **⋯** menu — rather than a **⇄** symbol next to it. The symbol was tested on someone who knew the feature existed and still didn't read it as "choose a reference book".
- **"or paste entries instead" is a proper button with a gap below the drop zone**, not a link tucked against its edge. A near-miss used to open the file browser, which is a confusing thing to have happen when you were trying to paste.
- **A phone gives you far more of your entries and far less toolbar.** The filter controls now share a row instead of stacking three deep, and the chrome above your first entry is down from 236px to 170px on a small phone — from 46% of the screen to 35%.
- **Select mode's toolbar is a single Actions menu** rather than eight buttons wrapping across three lines. Change type, set public/private, hide from export, move to folder, select all and deselect all are all in it, with the number selected shown beside it. **× Exit** is gone: switching the mode dropdown back to Search was already the way out. Select mode went from showing two entries at a time to eight. On a desktop the toolbar is unchanged.
- **Delete and other irreversible buttons no longer look like the ＋ New button.** They were the same red in every theme — and in a custom theme, *literally* the same colour, so a red accent gave you an identical Delete. Destructive buttons are now outlined rather than filled, in their own hotter red, and only fill in when you hover them.
- **Resizing the window across the phone/desktop boundary now closes any open panel.** The Settings panel is a narrow column on a desktop and a full-screen overlay on a phone, so dragging a window narrow used to leave you with a takeover you never asked for.
- **Everything you tap on a phone is now big enough to tap.** Buttons, dropdowns, checkboxes, trigger chips, suggestion chips, the home screen's recent-books list and the update notice's own buttons all carry a full-sized touch target — the standard 44px — where most of them were built at mouse sizes and carried across unchanged. Some grew; many already had the room around them and simply claim it now, so the screen is only slightly busier than before. The trigger word suggestions are the most visible change: those chips were 21px tall and are the thing you tap most while writing an entry.
- **Escape closes whatever you opened last, in a narrow window.** The entry editor, Settings, the quick menu, the reference sheets and the filter popover ignored it before, so it either did nothing or closed something underneath. Phones have no Escape key — this is for a desktop window dragged narrow, or a tablet with a keyboard.
- **Renaming your lorebook on a phone moved into the lorebook menu**, alongside rename for every other book. The pencil beside the title is gone in both layouts — the name itself is the button now, and it takes the whole space it sits in.

### Fixed

- **The Find/Replace scope popover no longer opens off the side of the screen on a phone**, where it couldn't be scrolled to or tapped. ([#124](https://github.com/MrKingPingus/MKP-Lorebook-Builder/issues/124))
- **Replace now applies on a phone.** Once the popover above was reachable, **Proceed** still did nothing.
- **The bottom of the app no longer hides under Safari's address bar on iPhone and iPad**, which is exactly where the hotbar and the **+** button live.

### Under the hood

- **The tour's sample books are never saved to your browser.** They behave like real lorebooks while the tour runs — they show in your book list, they can be paired as a reference — but nothing about them is written down, so closing the tab part-way through leaves your library exactly as it was. They also don't count against the ten-lorebook limit.
- **Creating two lorebooks in the same instant could lose the first one.** The index was read from a stale copy, so the second create wrote back a list that had never contained the first book — it stayed on disk but vanished from your library. Nothing in the app did this before the tour, which loads two sample books back to back.
- **The screenshot generator is gone**, along with `TOUR_RELEASE`, the capture-scale constant and the badge-placement scorer — about 400 lines. The tour points at live selectors instead, so a step whose target no longer matches is skipped with a console warning in development rather than silently showing the wrong picture. 0.9.0's six captures moved to `announcements/images/0.9.0/` so that release post keeps working; they no longer ship in the bundle, which takes 1.5MB off the deployed site.
- **The landing page had never been layout-checked.** The mobile suite was built against the builder and its panels, so the app's first screen went through the entire overhaul ungraded. It now gets a sweep pose of its own, which immediately found five controls under the touch floor.
- **`--destructive` is no longer tied to `--accent`.** It has its own value per theme, and in the custom theme it is deliberately fixed rather than derived from the user's accent — destructive is the one role that must not follow a preference. The high-contrast theme keeps them equal on purpose, where contrast matters more than hue and the outline-versus-fill treatment does the separating.
- **The `crosstalkEnabled` setting is gone.** It's derived from whether a reference book is paired. A stored value from an older version is ignored, and nobody could have had a pairing saved with the setting off — turning it off always cleared the pairing.
- **A 44px touch-target floor is defined as a shared token**, expressed as hit area rather than visual size, so a small control can carry a full-size tap region without growing the row it sits in.
- **The layout-check suite grades occlusion structurally.** A control covered by an open dialog is now recognised as covered *by a layer* rather than reported as a fault, without the check having to know that layer's markup.
- **It also measures tap targets by the area that actually responds to a tap**, probing the page rather than reading each control's box. Measuring boxes would have failed controls that carry a correct target through padding, and passed ones merely made bigger to look right.
- **The tap-target check now fails the build rather than noting it.** It spent the overhaul as a note because the app started with 227 controls under the floor and a permanently red check gates nothing. It gates now because the count reached zero. Controls that are deliberately smaller are declared in one list with a written reason, and each keeps a floor of its own, so one shrinking further still fails.
- **The touch-target utilities only apply below the phone breakpoint.** An invisible tap region is not inert — it takes clicks in the space around a control — which is behaviour nobody asked for on a desktop, where the layout checks don't run.
- **Six phone-only layers register with the Escape stack**, including the entry editor at a new priority below every popover and sheet. The filter popover's private key listener is gone; it was the one layer behaving correctly, by bypassing the mechanism built for it.

---

## 0.9.1 — 2026-08-11

### Under the hood

- **The mobile UI now has a test suite.** It drives the app on phone-sized screens the way the existing suite drives it on desktop, with real touch taps and long-presses, and adds a set of layout checks — nothing off-screen, nothing untappable, nothing covered — that run against every panel, popover and sheet.
- **Test books can now be generated at the app's limits** (25 triggers, a full-length description, 500 entries) rather than only the hand-written fixtures, so the layouts get checked under pressure instead of on tidy data.
- **Fixed a blind spot in the existing suite:** the reference/crosstalk scenarios were leaving the Settings panel open for the rest of each run, because they closed it with a key press that doesn't close it. Harmless on desktop, where the panel sits beside the builder — but it meant those scenarios were never testing the layout they claimed to.

---

## 0.9.0 — 2026-07-31

The interface overhaul. The window header has been emptied down to essentials,
the lorebook title has become a menu, and everything that's a *readout* rather
than an *action* has moved to a new status bar along the bottom.

### New

- **The lorebook title is a menu.** Click it for two columns: every lorebook you've saved on the left, import and export on the right. Switch books, start a new one, delete one, download a copy or grab a template — all one click from the title. Hover to peek, click to keep it open, double-click to rename the book.
- **A status bar runs along the bottom of the window.** It holds the things that are simply *true* about your work rather than things you do to it: whether you're saved (and how long ago), your entry count, how much browser storage you're using, links to report a bug or request a feature, and which version you're running.
- **A pull tab on the right edge opens your lorebook list.** The window *widens* to fit the panel rather than the panel covering your entries, so nothing you were reading gets hidden. Click it again to tuck it away.
- **One menu for every size setting — `⤢ Size`, bottom-right.** Window size (named presets or exact numbers), text size, entry height and the **+** button's size, each showing its current value. **Save as default** sets what **Reset to default** returns to. **Reset all sizing** puts everything back except your text size, which is left alone deliberately — it's an accessibility setting you may be relying on.
- **Settings has a filter box.** Type `fab`, `shortcut`, `dark mode`, `storage` and the panel narrows to those controls, opening whichever section holds them. It matches words that aren't in the visible label, so "hotkey" finds **Keyboard shortcuts**.
- **You can sort your lorebook list.** It's ordered by what you opened most recently, with an **A–Z** toggle in the list header if you'd rather find books by name.
- **This notice, and a tour to go with it.** When you come back after an update you'll get a short summary of what changed, and the option to click through annotated screenshots of the new features. Close it and it won't ask again — **Take the tour** on the home screen's *What's new* panel reopens it any time.

### Improved

- **The header is down to four things** — the logo, the lorebook title, a gear, and close. The storage ring, feedback links and entry counts moved to the status bar.
- **The gear opens Settings directly.** No dropdown standing between you and the only thing it offered. **Ctrl+,** does the same. If you preferred the old **☰** menu, Settings → Layout & Controls → Navigation → **Legacy menus** brings it back.
- **Settings went from six sections to four**, grouped by *what you're changing* rather than by whichever feature introduced the setting: **Editing & Entries**, **Appearance & Accessibility**, **Layout & Controls**, **System**. Nothing changed meaning or default. Every section starts closed, so you pick where you're going instead of scrolling past everything.
- **Keyboard shortcuts moved to Layout & Controls**, at the top, beside the hotbar and FAB menu. The **?** cheat sheet's *Edit shortcuts* link goes straight there.
- **Every import offers the same four choices, wherever you start it:** *Import as new*, *Append*, *Replace*, and *Back up first*. Previously the side panel had the backup option but couldn't take pasted text, and the hotbar's Import took pasted text but had no backup — so which one you happened to open decided what you were allowed to do. Pasted entries now reach all four; they used to only ever append.
- **A backup taken before a replace is always JSON.** You could previously pick TXT, which doesn't carry your triggers — a poor thing to discover after you've overwritten the original.
- **The default window is much bigger: 1200×900, up from 760×620.** If you never picked a size of your own, yours updates automatically. If you did, your choice is untouched.
- **Renaming a lorebook is a double-click on the title**, rather than a text field that was always live and easy to edit by accident.
- **"Entry header" is now "Entry height"**, which reads better.

### Under the hood

- All three import surfaces now run one shared implementation, so a fix in one reaches all of them.
- The README covers running and hosting the builder locally: Node requirements, install and run steps, what each command does, where your data is stored, and the GitHub Pages setup.
- Versioning starts here at **0.9.0**, with 1.0 reserved for the full site integration. The version shows in the status bar so a bug report can name an exact build.
- New browser-storage key `mkp_last_seen_release`, holding the release you were last shown.
- The feature tour's screenshots are generated by `verify/screenshots.mjs` and committed under `public/screenshots/<release>/`. One list in `constants/tour-steps.js` drives both the generator and the in-app tour, so a UI change breaks them in the same place instead of leaving the tour quietly stale.

---

## 2026-07-27

### Additions

- **Reorder folders by dragging.** Drop a folder onto the **top edge** of another folder's header and it becomes that folder's sibling, sitting just above it — including moving a folder above whichever one is currently first. Dropping onto the middle of a header still files inside it, as before. A blue line across the top of the header shows which one you'll get.
- **Folder headers follow the entry header height setting.** Setting roomier rows in Settings → Editing & Entries now sizes the folder headers to match, instead of leaving them at the original height.

### Fixes

- **The buttons on a folder header are much bigger.** Add-entry, nest and delete were tiny and hard to hit; they're now proper 24px targets with a hover background, matching the collapse button.

- **Add an entry straight into a folder** with the **＋** button on its header, instead of making one and then moving it.
- **Two new keyboard shortcuts** — **Alt+V** selects everything currently visible (turning on Select mode if it isn't already), and **Alt+D** clears the selection. "Visible" honours whatever search, type filter or folder filter is active, so you can filter down and grab exactly that set. Both are rebindable in Settings like every other shortcut.
- **Folder collapse stages are now yours to pick.** Settings → Folders has a checkbox for each size — Full, Condensed and Hidden — so you can have a folder button that's simply open-or-shut, or one that stops at a condensed middle step on the way. **The new default is open-or-shut**; turn Condensed on if you want the middle stage back. Full is always on, and one other stage has to stay on, since a button with only one size to show wouldn't do anything.

### Fixes

- **A folder you open by hovering during a drag now closes again if you don't use it.** Resting a dragged entry over a closed folder still opens it so you can drop inside, but if you carry on and drop somewhere else, the folder goes back to how you left it. The folder you actually drop into stays open.
- **Turning off a collapse stage no longer leaves folders stuck in it.** A folder set to Condensed now correctly falls back to full size when you turn the Condensed stage off, and returns to condensed if you turn it back on — previously the header button updated but the entries underneath stayed condensed.

- **Drag entries into and out of folders.** Dragging now understands folders: where you drop something decides where it belongs.
  - **Drop between two entries inside a folder** and it joins that folder. **Drop between two top-level entries** and it comes out of whatever folder it was in. **Drop straight onto a folder's header** and it files inside.
  - **A drop zone appears under the list while you drag** — drop there to pull something out of every folder and send it to the end.
  - **A blue line shows exactly where the entry will land** before you let go, and it won't appear anywhere a drop isn't allowed.
  - **Drag several entries at once.** Select the ones you want, then drag any of them by its handle and the whole selection travels together, landing as one block in the order you had them. Grabbing an entry that *isn't* selected drags just that one and leaves your selection alone.
  - **Drag a whole folder** by the handle on its header, to reorder it or to drop it inside another folder — everything inside comes with it. Folders can't be dropped inside themselves, and the three-level nesting limit still applies.
  - **The list scrolls itself** when you drag near the top or bottom edge, so you can move an entry somewhere off screen.
  - **Hold a dragged entry over a closed folder** and it opens after a moment so you can drop it exactly where you want inside.
  - **Condensed entries can be dragged too**, from anywhere on the row.
  - Dragging still works while the list is filtered or searched — drop between two rows you can see and it goes exactly where it looks like it will.

### Fixes

- **Undoing a drag now takes one press of Ctrl+Z.** Previously every entry you dragged *past* was recorded as its own separate step, so dragging an entry ten rows down took ten presses to undo — and quietly used up ten slots of your 50-step undo history. A drag is now a single step, and a drag that ends up back where it started doesn't take a step at all.
- **Entries inside a folder can now be dragged.** They couldn't be — starting a drag on one was cancelled immediately.

- **Filter the list by folder.** A **Folder ▾** button in the filter row lets you narrow the list to one folder, several at once, or **Unfiled entries** — everything you haven't put away yet. It only appears once you actually have folders, so it doesn't clutter the row if you don't use them.
  - **Picking a folder includes everything nested inside it**, so filtering to an outer folder shows its sub-folders' entries too rather than just the entries sitting directly in it.
  - **Folder headers stay while you filter**, so you keep the structure and can still collapse things — folders left with nothing simply drop out of view, the same way they do during a search.
  - **A tucked folder opens itself while a filter is on**, so filtering to a folder you'd shut doesn't just show you an empty header.
  - **Each folder in the menu shows how many entries it holds**, counting everything nested inside it, so the number matches what picking it will show you.
  - **Deleting a folder you'd filtered to brings the whole list back** instead of leaving you staring at an empty screen.
  - **On mobile** the folder options live inside the existing **Filter ▾** popover alongside the type checkboxes, so nothing new crowds the top of the screen.
  - **In reference mode the filter only touches the lorebook you're editing.** Folders belong to one lorebook, so filtering by them leaves the reference pane beside it showing its full list. Swapping which book is active clears the filter rather than pointing it at the wrong book.
  - Filtering by folder still works under the **"cross-book matches"** sorts, even though those hide folder headers — you get that folder's entries as a flat list, still split into matched and unmatched.

- **Select entries with Shift and Ctrl, like a file manager.** You no longer have to turn Select mode on first — **Shift+click any entry** and it opens Select mode with that entry already picked. From there:
  - **Shift+click** another entry to grab **everything between the two**, so a run of twenty entries takes two clicks instead of twenty.
  - **Ctrl+click** (Cmd on a Mac) to **drop one entry** back out of the selection you've built.
  - **Ctrl+Shift+click** to **drop a whole range** back out.
  - **Shift+click a folder's header** to select **everything inside it**, sub-folders included; Ctrl+click the header gives it all back.
  - Adding and removing are always what they say — nothing you've selected is ever silently thrown away by the next click.
  - **A range reaches into a collapsed folder.** Entries tucked out of sight still sit between the two entries you clicked, so they come along — and the folder's header shows how many of its hidden entries are selected, so the count is never a mystery.
  - **Your open entries are safe.** These shortcuts only work on an entry's header row, so Shift+clicking inside a description box still selects text the way it always has.
  - All of it is listed under **Selecting with the mouse** in the keyboard shortcuts overlay (press **?**).

### Fixes

- **A → Z and Z → A now put folders in alphabetical order too.** Previously a folder was positioned by the first entry inside it, so a folder named "Zeta" holding an entry called "Apple" could sit above a loose entry called "Beta" — the list didn't read alphabetically even though that's what you'd asked for. Folders and entries now sort together in one alphabetical run, by the folder's own name. Sorting by **Last modified** is unchanged: a folder still appears wherever its most recently edited entry lands, which is what that sort is for.

---

## 2026-07-25

### Additions

- **Folders** — you can now group entries into colored folders, purely for your own organization inside the builder. Folders are **never exported** and have nothing to do with entry types: your JSON, TXT, DOCX and ZIP exports come out exactly as before, whether an entry is filed or not.
  - **Make one** with the **＋ Folder** button in the filter row, or straight from a selection with **Move to folder… → ＋ New folder** in Select mode.
  - **File entries** two ways: pick **Move to folder** in an entry's footer for one entry at a time, or select several entries and use **Move to folder…** to move the whole batch at once.
  - **Collapse a folder in stages.** The button on its header cycles through three sizes: full entries, **condensed** (each entry shrinks to a single line — type dot, name, and Expand/Remove), and **tucked** (entries hidden entirely, with the header showing how many are inside). Click round again to return to full size.
  - **Folders can go inside folders**, up to three levels deep. Use the **⇥** button on a folder's header to move it into another one, back out to the top level, or **＋ New folder** to create a fresh folder and drop this one straight inside it. The limit exists because each level indents the rows, and past three there isn't enough width left to read entry names — especially beside a reference lorebook.
  - **Collapsing a folder collapses what's inside it.** Tucking a folder hides everything below it, sub-folders included; condensing one shrinks its whole contents. Opening it back up restores whatever each inner folder was set to — collapsing a parent never overwrites your choices for the folders inside.
  - **Collapse Folders** in the filter row tucks every folder at once, and turns into **Open Folders** to bring them all back. It only appears once you actually have folders.
  - **Deleting a folder never deletes what's in it** — entries move back out, and any folders inside it move up to wherever the deleted folder was.
  - **Group by type works inside folders** — turn it on and each folder's entries are grouped under type headers, just like the main list.
  - **You can still open one entry inside a condensed folder** — hit Expand on any condensed row and that entry opens at full size with everything on it, while the rest of the folder stays compact.
  - **Rename** by clicking a folder's name, and **recolor** by clicking its dot to pick from eight pastel colors, deliberately kept distinct from the entry-type colors so a folder stripe never reads as a type. An entry filed into a folder shows that folder's name and color on its own footer button, so you can always tell where it lives.
  - **Undo works on all of it** — creating, deleting, renaming, recoloring, and moving entries in or out are all undoable with Ctrl+Z. Collapsing a folder isn't undoable, since it's just a view.
  - Folders appear in the list wherever their first entry sits, and unfiled entries stay right where they were around them, so nothing gets shuffled into separate piles. A brand-new empty folder sits at the **top** of the list until you put something in it, so it's right where you're looking after making one.
  - **Settings → Folders** has two options: **Collapse stages** lets you drop the middle "condensed" step if you'd rather a folder was simply open or shut, and **Show entry stats on condensed rows** puts the trigger and character counts back on condensed entries, sized down to fit. Changing the collapse stages never loses anything — a folder you'd already condensed keeps that setting and just renders full-size until you touch it.
  - **In reference mode**, folders belong to the lorebook you're actively editing — the reference pane beside it still shows a plain list, and the folder buttons explain themselves rather than doing nothing. Copying an entry between two lorebooks drops its folder, so it arrives loose in the destination instead of remembering a folder that isn't there.
  - **Naming is immediate** — a folder is created with its name field already open and selected, so you can type the name straight away instead of hunting for it.
  - **Searching reaches inside collapsed folders** — if a match is filed in a folder you've tucked shut, the folder opens itself for the duration of the search and closes again when you clear it.
  - The two **"cross-book matches"** sort modes hide folders while they're on, since their whole job is to split the list into matched and unmatched — regrouping by folder would undo that. The folder buttons grey out with a note while that sort is active.

- **Synonyms have a backup source** — when the main dictionary has no synonyms for a word (which used to just show "No synonyms found"), the thesaurus popover now falls back to a broader "related words" list so you're less likely to hit a dead end. These related words are looser than the dictionary's curated synonyms — handy, but eyeball them before adding. The backup only kicks in when there's nothing else to show, so it never slows down words that already have good synonyms.
- **Widen any trigger with "＋ Related terms"** — the synonyms popover now has a **＋ Related terms** button. When a trigger returns only a handful of dictionary synonyms (or you just want a wider net), it pulls in looser related words on demand — **grouped by part of speech** (nouns / verbs / adjectives / …) and trimmed of rare, obscure words, so the extras come organised instead of as a random pile. It only fetches when you ask, so it never slows down the normal popover.

### Fixes

- **Filing entries now clears the selection** — after moving a batch of selected entries into a folder, they stay selected no longer, so you can go straight on to picking the next batch for a different folder.
- **Drag-to-reorder moved the wrong entry** — dragging an entry while a search was active, or while **Group by type** was on, would silently reorder two *different* entries elsewhere in the list instead of the one you dragged. Reordering now always follows the entry you actually picked up.

### Adjustments

- **Clearer synonym headers for word variations** — when you open synonyms on a word like "lives" and the results actually come from its base form "life", the popover header now says *Synonyms for "lives" (via "life")*, so it's obvious why the suggestions look the way they do.

---

## 2026-07-22

### Additions

- **Color themes** — Settings → Appearance now lets you switch the whole app between **Dark** (the original), **Light**, and a **High contrast** theme for maximum readability. Your choice is remembered and applied the instant the app loads, with no flash of the old colors.
- **Custom theme** — pick **Custom** and set seven core colors (background, panel, border, text, muted text, accent, and links) with color pickers; the app shades everything else — panels, hovers, borders — from those. A live contrast readout tells you whether your text-on-background is easy to read (AAA / AA / Fail), so you don't accidentally make it unreadable. Custom colors are saved and restored across reloads.
- **System theme** — a new **System** option follows your device's light/dark setting automatically, and flips the moment your device does.
- **Accessibility settings** — a new Settings → Accessibility section with:
  - **Text size** — bump the app's text to 90% / 100% / 110% / 125%. Only the text scales; the layout stays put. Remembered across reloads.
  - **Reduce motion** — a toggle that turns off transitions and smooth scrolling (and your device's own "reduce motion" setting is always respected).
  - **High-contrast** — a quick toggle for the high-contrast theme, right where you'd look for it.
- **Clearer keyboard focus** — tabbing through the app with the keyboard now shows a clear focus ring on whatever's selected, so you can always see where you are. Icon-only buttons (the menu, the ＋, close buttons) also got proper labels for screen readers.
- **Entry title length warning** — entry titles now show a small advisory counter once you pass 40 characters, nudging you toward the 50-character length CharSnap prefers. Like the app's other counters it's only a heads-up — longer titles are still allowed.
- **Entry header height** — Settings → Editing & Entries has a new **Entry header height** option (Default / Medium / Large). The taller rows make a long lorebook easier to scan if the dense default feels overwhelming.
- **Shift+scroll works on more dropdowns** — the Shift+scroll-to-cycle shortcut (already on the entry type picker) now also works on the trigger delimiter picker, the Search / Find-Replace / Select mode picker, and the sort button — so you can flip a setting without opening the menu.
- **"Import File" opens your file browser right away** — on the launch screen, the **Import File** tile now opens your file picker immediately and loads the file straight into a new lorebook: no import screen, no "append or replace?" prompt, and no naming step (it takes the file's name). Pasting entries still lives on its own **Import Paste** tile, so nothing's lost.
- **Report a bug or request a feature from the header** — a 🐞 bug icon and a 💡 lightbulb icon now sit in the window title bar, just left of the storage ring, each opening the matching GitHub form in a new tab. A more visible second home for the links that previously lived only in the launch-screen footer.

### Fixes

- **Expand All no longer breaks single collapse** — after pressing **Expand All**, collapsing a single entry (with its button or a double-click) used to snap *every* entry shut. Now it collapses only the one you clicked and leaves the rest open.

### Adjustments

- **Keyboard shortcuts moved into Accessibility** — the shortcut editor now lives under Settings → Accessibility (it used to be its own "Hotkeys" section). Nothing about how it works changed.
- **Removed the broken "Full type button grid" setting** — this Editing & Entries toggle never had any visible effect, so it's been taken out. Its place is now the new Entry header height option.
- **The lorebook switcher is easier to spot** — the easy-to-miss little arrow next to the lorebook name is now a clearly-labeled **Switch ▾** button, so the quick lorebook-switcher reads as an actual control. Renaming the book in place works exactly as before.
- **Hotbar Import button tidied up** — it now simply reads **Import** (matching **Export**) and uses the same bold arrow as Export instead of a thinner one.
- **Tidier window header** — the entry count now sits right next to the lorebook name (just left of the Switch button); the lorebook name field stays perfectly centered in the window no matter what's beside it; and the header's menu, close, and new feedback icons are larger and more uniform, closer in size to the storage ring.

---

## 2026-07-21

### Additions

- **Customisable keyboard shortcuts** — Settings → Hotkeys is now a full shortcut editor. Click any action, press the keys you want, and it’s bound — modifiers and all, not just a single letter. Browser-reserved combos (Ctrl+T, Ctrl+W…) and bare letters are refused, and if a combo is already used elsewhere you get a heads-up. Each shortcut has a reset, plus a “Reset all to defaults”. Your existing New Entry / Undo / Redo letters carry over automatically.
- **More things you can bind** — alongside New Entry, Undo, and Redo, you can now set shortcuts for toggling Select mode, expand/collapse all, focusing search, opening Find & Replace, toggling and swapping the reference panel, exporting, importing entries, opening Settings, and opening the shortcut list. Every shortcut in the list is live — there are no placeholders.
- **Press `?` for the shortcut cheat sheet** — a tidy, always-current list of every shortcut, grouped by area. It reflects any custom keys you’ve set, and has an “Edit shortcuts…” button that jumps straight to the Hotkeys settings.
- **Escape is smarter about what it closes** — with several things open at once (say a menu on top of Select mode), Escape now closes just the top-most one, then the next, in a sensible order — instead of dismissing everything or the wrong thing.

### Adjustments

- **Shortcut hints stay in sync everywhere** — the hints shown on the hotbar buttons, the launch screen, the empty-entry message, and the restore note now show your *actual* keys, so they update the moment you rebind something instead of showing the old default.

### Fixes

- **Option-key shortcuts now work on Mac** — the Alt/Option shortcuts (e.g. Option+N for a new entry) were dead on macOS, because holding Option makes the keyboard emit a special character instead of the plain letter. Shortcuts are now matched by physical key, so Option combos fire correctly on Mac while Shift-based symbols (like `?` vs `/`) still stay distinct.
- **Shortcuts keep working while you're typing** — combos with a modifier (like Alt/Option or Ctrl/Cmd) now fire even when the cursor is inside a text field, so you can add a new entry, undo, or open Find & Replace without first clicking out. In particular, Undo/Redo now work right after creating an entry (when the cursor lands in the new entry), and Ctrl/Cmd+Z inside a field now runs the app's undo. Single-key shortcuts (`/`, `?`) still stay out of your way while typing.
- **Find & Replace shortcut jumps into the field** — opening Find & Replace by shortcut now drops your cursor straight into the Find box (and carries over whatever was in the search box), matching how the search shortcut works. Pressing it again toggles back to Search.
- **Export shortcut opens the real export menu** — the Export shortcut now pops the same filename-and-format menu as the hotbar Export button, centered on screen, instead of just opening the Import/Export tab.
- **Import shortcut opens the file picker** — the Import shortcut now takes you straight to your file browser to pick a lorebook, instead of stopping at the import screen. After you pick a file, it asks whether to **append** the entries to the current book or bring them in as a **new** book.
- **The shortcut guide gets out of the way** — pressing a shortcut while the `?` cheat sheet is open now runs it and closes the guide in one go.

### Additions

- **Bulk Hide / Show from Export in Select mode** — Select mode now has a **Hide from Export ▾** button next to Change Type. Tick a group of entries (or use Select All Visible), then choose **Hidden** or **Shown** to flip their state all at once, in a single undoable step. It sits right alongside the existing per-entry Hide button, which still works for one-off changes.
- **Bulk Public / Private in Select mode** — a matching **Set Public/Private ▾** button lets you flip the CharSnap Public/Private state of a whole selection at once (or all entries via Select All Visible), the same way — one undoable step. Complements the existing All Public / All Private hotbar actions and the per-entry toggle.
- **Public entries are marked at a glance** — a small eye icon now appears on any entry you've made Public, so you can see a book's public surface without opening each entry. (Private entries are unmarked by default, since that's the standard state.)
- **Optional "Mark private entries" setting** — if you'd rather see private entries flagged too, Settings → Editing & Entries has a new toggle that adds a crossed-out eye to every Private entry. Off by default.

### Adjustments

- **New entries default to Private** — matching CharSnap, where a book is private until you choose to make entries public. New entries now start Private; use the per-entry toggle, the bulk Set Public/Private, or All Public to open them up. Entries you already made Public keep their setting.
- **Hide-from-Export has its own icon** — the "hidden from export" marker is now a crossed-out export arrow instead of a crossed-out eye. The eye now means Public/Private, so the two features no longer share a symbol.

### Fixes

- **The ＋ button stays put in the bottom-right on mobile again** — on phones the floating ＋ button was drifting out of position (and landing on different sides in different browsers), which also threw its press-and-hold quick menu off. The button now sits a consistent gap from the right edge above the hotbar — near your thumb — and its quick menu opens neatly above it and stays fully on-screen instead of spilling off the side.
- **Long-pressing the ＋ button no longer pops up your phone's text-selection menu** — press-and-hold on the ＋ used to make the phone try to *select the "+" character* (blue selection handles, plus the Copy / Look Up / Translate bar) instead of opening the quick menu. The button's symbol is now non-selectable, so long-press reliably opens the quick menu.

---

## 2026-07-19

### Fixes

- **Imported entry types are preserved again** — importing a JSON lorebook now reads the `entryType` field used by CharSnap (and the current template), so entries keep their real types instead of all arriving as "Character." Older books saved with the previous `type` field still import correctly, so nothing you exported before breaks.

### Additions

- **Export matches the CharSnap format** — exported JSON now uses CharSnap's exact shape (numbered entries, `entryType`, and an `isPublic` flag). A book you export drops straight back into CharSnap and re-imports here without losing types or visibility. Downloaded and copied templates use the same format.
- **Public / Private per entry** — each entry has a new Public/Private toggle (next to "Hide from Export") that sets its `isPublic` state for CharSnap. New entries default to Public.
- **"All Public" one-click action** — a new hotbar action (also in the ＋ button's quick menu) flips every entry in the book to Public in a single, undoable step — handy right before an export.
- **"All Private" companion** — a matching hotbar action that flips every entry to Private in one undoable step, for when you want to pull a whole book back from public.
- **Export from the hotbar** — a new **Export** action can be pinned to the hotbar (or used from the ＋ quick menu). It opens a small floating menu right above the button where you set the filename and pick a format (JSON / TXT / DOCX) or copy JSON — so exporting no longer means opening the Import/Export panel.
- **Redesigned ＋ quick menu + add actions to the hotbar** — the ＋ button's pop-up menu is now a compact **horizontal** bar of actions (it wraps to a couple of rows on a narrow window) instead of a tall list. It also has an **"Add to hotbar"** button in the middle: press it, click the hotbar slot you want to fill, then click an action — perfect for dropping Export, Undo, or anything else exactly where you want it, without opening Settings.
- **New default hotbar layout** — a fresh setup now shows Import · (empty) · Undo on the left and Redo · (empty) · Export on the right. Clear All is no longer on the hotbar by default (it's niche — you can still pin it anytime). If you've already customized your hotbar, your layout is left as-is.

---

## 2026-07-17

### Additions

- **Request a feature from the launch screen** — the launch screen footer now has a **💡 Request a feature** link sitting next to **🐞 Report a bug**. Both links open a short, guided form on GitHub (feature requests are filed under the `enhancement` label, bugs under `bug`), so suggestions land in one place and are easy to track. Filing an issue requires a free GitHub account.

### Adjustments

- **Bug report link now uses the guided form too** — the existing "Report a bug" link previously opened a pre-filled blank issue; it now opens the same structured form as feature requests, so both entry points behave consistently whether you start from the app or from GitHub directly.

---

## 2026-05-19

### Additions

- **Storage compression** — everything the app saves to `localStorage` now goes through a fast text compressor (`lz-string`) before being written, and is decompressed transparently on read. In practice this means roughly 4–6× more headroom inside the same browser cap, so heavier users with many books, longer descriptions, or enabled snapshots have substantially more room to grow. Existing saves are still read correctly — old plain-JSON values are accepted and re-saved in compressed form the next time their book is edited, so no migration step is required and no user action is needed.
- **Lorebook cap raised from 10 to 50** — combined with the new storage headroom, you can now keep up to 50 lorebooks at a time. The storage indicator gives you live feedback on how close you actually are to the cap, so you can use your own judgement about how many books to keep on the shelf.
- **Storage usage ring** — a small circular indicator now sits in the window title bar, just to the left of the menu button. The outer ring stays neutral; the fill arc shows how much of `localStorage` the app is currently using, turning yellow at 60% and red at 85% so the warning is glanceable. Hovering on desktop pops a one-line summary (`1.2 MB / 5.0 MB used (24%)`); clicking (or tapping on mobile) opens a fuller breakdown across Snapshots, Entry content, Lorebook index, Settings, and Window state, with a Refresh button. The number updates automatically whenever the app writes to storage — no polling — and the breakdown is intentionally global, not per-lorebook, since the meaningful question is how close the whole app is to the quota cliff.
- **Browser-aware storage limit** — Safari (and every browser on iPhone or iPad, since Apple forces them onto Safari's engine) caps `localStorage` at 5 MB, while Chrome, Firefox, Edge, Brave, and other browsers on Mac, Windows, Linux, and Android allow 10 MB. A new "Browser storage limit" dropdown picks which cap the storage usage ring reports against. On first launch the app makes a best guess from your browser; you can change it any time via **Settings → Window & Layout** or directly inside the storage ring's detail popover (a "Browser" selector sits just above Refresh).
- **App logo refresh** — the book emoji that sat next to the "LOREBOOK BUILDER" wordmark in the title bar has been replaced with a circular Sacabambaspis portrait at 45px so the artwork is readable.
- **Toggle Funny Fish** — a new toggle at the bottom of Settings → Window & Layout swaps the title-bar logo between the new Sacabambaspis portrait and the original 📖 book emoji. The emoji variant renders at its original 16px size, so turning the toggle off restores the compact header exactly as it was before.

### Fixes

- **Storage usage indicator now reports against the real `localStorage` cap** — the ring previously divided actual usage by whatever `navigator.storage.estimate()` reported, which is the browser's *total* origin storage budget (pooling `localStorage`, IndexedDB, the Cache API, and more), not the `localStorage`-specific limit. On most devices that budget is computed as a percentage of free disk space, so users were seeing inflated quotas like 40 GB on phones or 1 TB on workstations — the percentage would barely budge until the real `localStorage` wall hit without warning. The ring now reports against either 5 MB or 10 MB depending on the user's selected browser profile (auto-detected on first launch, see "Browser-aware storage limit" above). Warning thresholds (60% yellow, 85% red) are unchanged but now meaningful.

---

## 2026-05-16

### Fixes

- **Crosstalk diff badges stay legible in select mode** — the desktop "in both ↗" / "differs ⚖" badge on entry and reference cards no longer collapses or wraps onto multiple lines when the row gets cramped (e.g. in select mode with a selected card whose staged-type dropdown eats header width, or in narrower windows). The badge is now flex-pinned with `nowrap`, so the entry name ellipsizes first instead of the badge.

---

## Polish Pass 5 (Phase 6) — 2026-05-12

### Additions

- **Thesaurus on attached triggers** — hovering an existing trigger chip on desktop (~250ms delay) or long-pressing it on touch (~450ms, same threshold as the suggestion-chip synonyms) now opens the synonym popover anchored to that chip. The popover has two action buttons: **Replace** swaps the chip's word for a single selected synonym; **Add Similar** appends any number of selected synonyms as new triggers (existing behaviour). Both paths respect duplicate triggers — synonyms already attached to the entry are disabled.
- **`thesaurusEnabled` setting gates the new affordance** — the existing Settings → Editing & Entries toggle now controls suggestion-chip synonyms AND attached-trigger synonyms together. Off keeps trigger chips strictly tap-to-edit.

### Known limitations

- **Synonyms popover currently disabled on conflict chips** — chips that already have a trigger-conflict popover (yellow or blue ring) do not open the synonyms popover on hover or long-press. An earlier attempt to wire a `↻ Synonyms ⇄ ↩ Conflict` switcher between the two popovers proved hard to land cleanly inside Polish Pass 5's scope; tracked as a Known Bug in `docs/plan.md`. Reaching synonyms for a conflicting trigger currently requires Allowing or Revoking the conflict first (which removes the ring), or editing the trigger inline.

---

## Polish Pass 5 (Phase 5) — 2026-05-12

### Additions

- **FAB quick-add menu** — hovering the FAB on desktop or long-pressing it on touch now opens a small popover above the button with every available hotbar action (Undo, Redo, Clear All, Import Entries, Reference toggle). Tapping the FAB itself still adds an entry as before; the popover is purely additive. Hover delays favour intent: ~200ms to open, ~200ms to close, with a mouse bridge between the FAB and the menu so moving between them doesn't dismiss the popover. Touch long-press uses the same ~450ms threshold as the thesaurus chips and the synthetic click after release is suppressed so the FAB doesn't fire Add Entry on the way out. Tap outside the menu (or on another control) closes it on mobile.
- **All hotbar actions surface from the FAB** — the popover lists every registered hotbar action regardless of the user's slot configuration. `useHotbarActions` now returns an `allActions` array alongside `slots`, giving the FAB menu a discovery affordance for actions the user may not have pinned to their hotbar.
- **Setting to disable the FAB quick menu** — `Settings → Window & Layout → FAB quick-action menu` toggles whether hover (desktop) and long-press (touch) open the popover. Off keeps the FAB strictly Add-Entry for users who find the menu intrusive. Defaults on.

### Adjustments

- **FAB tooltip trimmed** — the FAB's `title` attribute is back to `Add entry (Alt+N)` after the hover/long-press behaviour proved self-evident; the extra "hover or long-press for more actions" hint has been removed.

---

## Polish Pass 5 (Phase 4) — 2026-05-12

### Additions

- **Lander overhaul — five panels** — the launch view is now organized into Start tiles, Recent lorebooks, What's New, Learn, and Report a Bug instead of a single hero button plus three static sections.
- **Start tiles** — three large, clickable tiles for the most common first actions: **New Lorebook** (creates a fresh book and enters the builder), **Import File** (opens the Import / Export tab), **Import Paste** (opens the Import Entries popup in paste mode). The previous "Start Building →" button is replaced with a smaller "Continue to builder →" link in the footer for the I-just-want-to-keep-working case.
- **Recent lorebooks panel** — the top 6 lorebooks from the index are listed on the lander with their relative-time stamp. Clicking one switches to it and enters the builder in a single click. The currently-active book is flagged with a blue outline.
- **What's new panel** — bundles `CHANGELOG.md` at build time and renders it with a new hand-rolled markdown parser (no new dependencies). Scrollable container so the list stays compact; full history one scroll away.
- **Learn panel** — folds the previous How It Works and Tips sections plus the Import Templates row into a single Learn panel. Step copy refreshed to match the new tiles and adds the `Esc` shortcut to the hotkey list.
- **Report a Bug link** — lander footer now has a direct link to a pre-filled GitHub issue template (title prefix, `bug` label, sections for what happened / expected / repro / browser / console errors).

---

## Polish Pass 5 (Phase 3) — 2026-05-11

### Additions

- **Import Entries popup now handles three input modes** — a segmented control at the top of the footer "Import Entries" overlay picks between **Paste entries**, **Entries from file**, and **Whole book from file**. The paste and entries-from-file modes append to the active book. The whole-book mode parses a file and then asks whether to **Replace the active book** or **Import as a New Lorebook**, so a full book import no longer requires switching to the Import / Export tab.
- **Import tab gained an "Append to active" disposition** — after a file is parsed, the save / disposition prompt now offers `Append to active` alongside the existing `Replace` (with optional JSON / TXT backup) and `Import as New Lorebook` paths. Append skips the backup nudge since it doesn't replace data. The preview screen carries a one-line banner naming the chosen disposition so the user can see at a glance what `Confirm` will do.

### Fixes

- **First-run "New Lorebook" no longer lingers after an import** — the auto-created blank lorebook on first run is now marked as a placeholder. Choosing **Import as New Lorebook** from either the Import tab or the new whole-book mode in the popup silently discards the placeholder if it's still pristine (default name, zero entries). Users who land in the builder and immediately import are no longer left cleaning up an empty `New Lorebook` afterward.
- **First import from fresh storage no longer requires a retry** — `deleteLorebook` and `switchLorebook` in `use-lorebook.js` now read `lorebookIndex` and `activeLorebookId` from `useLorebookStore.getState()` instead of the React hook closure. The placeholder-discard step at the tail of `importAsNewLorebook` runs synchronously after `createLorebook`, so the closure was stale by the time `deleteLorebook` fired — `removeFromIndex(staleClosure, placeholderId)` returned `[]`, wiping the newly-created lorebook from the index. Manual deletes of the active lorebook had the same latent stale-closure problem in `switchLorebook` and are fixed by the same change.

---

## Polish Pass 5 (Phase 2) — 2026-05-11

### Adjustments

- **Bulk-select toolbar swap** — `Change Type… ▴` and the new `Apply Staged` button now sit on the **left** of the bulk action bar (adjacent to the entry-type column where the chips row drops down), while `× Exit`, `Select All Visible`, and `Deselect All` cluster on the **right**. Reduces the diagonal travel between picking a type and clicking the chip.
- **Select mode persists after Change Type** — applying a type to the selected entries no longer exits select mode or clears the selection. The same entries stay selected so further actions (re-applying a different type, copying, mixing in per-row stages) can be chained on the same set. `Copy to Other Panel` similarly stays in select mode (it still clears the selection since the originals were copied, not transformed).
- **Staged dropdown sits next to the entry name** — the per-row type dropdown now renders flush against the entry name rather than at the far right of the row, reducing the eye-travel between the name and the chooser. The card-header-right cluster (stats and action buttons) still floats to the far right.

### Additions

- **Per-row staged type changes** — while in select mode, each selected entry shows an inline type dropdown next to its name (desktop) or in its type slot (mobile). Picking a type **stages** the change without committing; a yellow border + glow flag rows whose staged type differs from their current type. A new amber `Apply Staged (N)` button appears in the bulk action bar when stages exist and commits all of them in one history snapshot. Stages clear on exit, on deselect, or when the apply-to-all `Change Type…` path runs. This is the deliberate flow for "change these three to Character, those two to Location, and that one to Item" in a single pass.
- **Escape exits select mode** — pressing the Escape key now exits bulk select mode (and cancels the mobile pick-from-reference sub-pose). The shortcut is suppressed while a text input or textarea is focused so inline editors and modal inputs keep their existing local Escape semantics. Future Escape targets (find/replace, compare mode, popovers) and a broader hotkey audit are catalogued in `docs/plan.md` under "Hotkey & ESC Roadmap".

---

## Polish Pass 5 (Phase 1) — 2026-05-11

### Renames

- **Rollback → Entry History** — the entry's snapshot button, tooltips, and Settings copy now use "Entry History" terminology throughout. The inactive state of the entry button reads "Enable entry history?" instead of the previously dimmed "↺ Rollback".

### Fixes

- **Skip really skips** — clicking Skip on the save-prompt dialog now closes the entry without saving a snapshot. Previously the prompt would dismiss but leave the entry open, forcing the user to commit to either Save New or Replace Latest.
- **Settings panel scroll** — the Settings tab now reliably scrolls when its section content exceeds the viewport. The scroll container now uses `flex: 1; min-height: 0` and `flex-shrink: 0` on each section so long sections (e.g. Editing & Entries fully expanded) no longer fall off the bottom of the screen.

### Adjustments

- **Native spellcheck on entry descriptions** — the description textarea now uses the browser's built-in spellchecker. Names, triggers, filenames, and other short or stylized fields remain unchecked.

---

## Crosstalk Compare Mode — 2026-05-09

### Additions

- **Side-by-side compare mode** — opens two entry cards (active and reference) side-by-side with live word-level diff annotations on every field.
- **Word-level diff service** — shared diff engine now powers both rollback snapshot comparisons and cross-pane comparisons.
- **Per-line diff outline boxes** — multi-line description diffs draw outline boxes around each changed line for easier scanning.
- **Desktop badges + cross-match sort** — crosstalk badges show on desktop; entries can be sorted by cross-book match count.
- **Fixed-column swap mode** — option to pin active/reference panels to fixed left/right columns (vs. the default click-to-swap behavior).

### Fixes

- **Copy-from-reference exits compare mode** — completing a field copy now exits compare mode and flips the matched-field badge to green.
- **Card height matching in compare mode** — both panels render at matched heights so the diff outline boxes line up.
- **Double-click bug in compare mode** — second click no longer collapses the wrong card.

---

## Mobile Description Alignment — 2026-05-06

### Fixes

- **iOS textarea / highlight overlay alignment** — the search-highlight overlay behind the description textarea now matches the textarea's iOS font-metric bumps so highlights stay aligned with the text on iPhone Safari.

---

## Thesaurus — 2026-05-05

### Additions

- **Synonym popover on suggestion chips** — hover (desktop) or long-press (mobile) a suggestion chip to open a synonym popover with definition cycling (◀ ▶), per-synonym selection, and an Add button.
- **Dictionaryapi.dev backend** — switched from Datamuse to dictionaryapi.dev for sense-disambiguated synonyms keyed off the meaning-level field.
- **Lemma fallback** — inflected words (plurals, past tense) retry against lemma candidates so look-ups don't silently miss.

### Fixes

- **Mobile selection + sticky hover + Add jitter** — popover stays open after the first tap, synonyms are tappable, Add button no longer jumps on press. Pagination replaced with native scroll.
- **Popover height stable** — height is locked across definition cycling so the popover doesn't reflow under the cursor.

---

## DOCX Import Recovery — 2026-05-05

### Fixes

- **DOCX heading/bold parsing** — entry boundaries are now recovered from heading and bold runs in the source document, so DOCX imports no longer collapse multiple entries into one block.

---

## Mobile Crosstalk — 2026-05-02 → 2026-05-03

### Additions

- **Overlay/annotation model** — mobile crosstalk surfaces shared triggers, same-named entries, and search hits in the paired book as inline annotations and overlays on the active book (no second panel).
- **Single-entry push + role-swap** — segmented control to swap which book is active, plus a single-entry push action for sending one entry to the paired book.
- **Pick from Reference pose** — multi-select pull pose with a pose-aware "in active" green pill while picking from the reference.
- **Reference picker moved to Lorebooks tab** — reference selection lives alongside the active book picker, not buried in Settings.

### Fixes

- **iOS auto-zoom on inputs** — disabled the iOS Safari font-size-based zoom on focused inputs.
- **z-index conflicts** — reference menu no longer renders under the backdrop; action buttons regained responsiveness; popovers raised above floating chrome.

---

## Crosstalk (Desktop Foundations) — 2026-04-25 → 2026-05-09

### Additions

- **Active + reference dual-book layout** — pairs a second lorebook as a read-only reference panel for browsing and cross-book operations.
- **Trigger crosstalk** — chips on shared triggers show a yellow ring (unacknowledged) or blue ring (acknowledged); hover opens a conflict popover listing entries that share the trigger. Acknowledgment ("Allow") and revocation persist per-lorebook.
- **Per-side find/replace** — match counters per book, scope toggles per book, Apply per book or Apply to Both.
- **Select mode across both panels** — bulk-select extended across the active and reference panels with Copy-to-other for the selected entries.
- **Crosstalk toggle surfaces** — added to LorebookPanel and as a hotbar action.
- **I-beam cursor on reference description** — visual affordance that the description body is selectable (read-only).

### Adjustments

- **Symmetric pane headers** — both panels share the same header layout; the redundant reference-name bar was consolidated into the header.
- **Hoisted filter bar** — search/filter/sort bar moved above the pane split so it spans both books in crosstalk mode.

---

## Undo/Redo Fix — 2026-04-08

### Fixes

- **Discrete entry actions now snapshot correctly** — changing an entry's type or adding, removing, or renaming a trigger chip now pushes a snapshot before the change, making each action individually undoable. Previously, `updateEntry` never pushed snapshots, so none of these changes were recorded in undo history.
- **Ctrl+Z no longer clobbers text field editing** — the global Ctrl+Z / Ctrl+Y handler now skips when a text input or textarea is focused, restoring native browser undo behaviour inside name and description fields. Previously, pressing Ctrl+Z while typing would jump back to the last structural snapshot (e.g. before the entry was created), discarding all text edits.

---

## Polish Pass 2 — 2026-04-06

### Adjustments

- **X button** on the build page now returns to the lander instead of doing nothing.
- **Lander** section order changed: "How It Works" now appears before "Tips". A link to the GitHub README has been added at the bottom of the Tips section.
- **Lorebook rename** is now triggered by double-clicking a lorebook name in the selector (was single-click), preventing accidental edits when switching lorebooks.
- **New lorebook name modal** — creating a lorebook now opens a small centered dialog prompting for a name. Press Enter or click outside to confirm; click × to skip. The lorebook is created either way.

### Fixes

- **Lorebook delete confirmation** simplified to an inline Yes / No prompt (same on desktop and mobile). Previously required typing "Yes" on desktop and used a native browser dialog on mobile.
- **Find & Replace** now covers entry titles in addition to triggers and descriptions. The "Replace All" button has been replaced with a **"Replace (X)… ▾"** button that opens a scope popover with chip-style toggles for **All**, **Title**, **Triggers**, and **Description**. A **Proceed** button executes the replacement against the selected fields.
- **Active field border color** changed from red (`--accent`) to a neutral blue-grey (`--focus-border: #a0b5d6`). The new variable is defined in `style.css` and applied to all focused inputs and textareas.
- **Tiered field borders** — description and trigger fields now show a persistent yellow or red border when their content is at or above the warning threshold, regardless of focus. The neutral blue-grey border still only appears on focus (below the threshold). Both fields respect the `tieredCounterEnabled` setting.

---

## Polish Pass 1

- Export section header added to the Import / Export panel.
- Find & Replace moved to an inline layout within the search bar row.
- Mobile dropdown width and menu button display fixes.
- Counter color correction: disabled state now shows green (was incorrectly red).
- Undo/redo hotkeys now customizable in Settings.
- New entry auto-focuses the name field on creation.
- Switching from Search to Find/Replace (and back) transfers the current query text.
- Search dropdown re-opens on input focus if results exist.
- Shift+click on the "All" type filter pill now shows a tooltip explaining the shift-click behavior.

---

## Phase 7 — Trigger Enhancements

- Expanded delimiter options: 6 choices (comma, semicolon, pipe, slash, colon, tab), configurable in Settings and persisted to `settings-store`.
- `scan-service.js` — generic lorebook scanner service; accepts a lorebook and a predicate, returns findings.
- Trigger crosstalk detection: chips on conflicting triggers show a yellow ring (unacknowledged) or blue ring (acknowledged). Hovering opens a conflict popover listing the entries that share the trigger.
- Allow / Revoke acknowledgment system: conflicts can be marked as intentional ("Allow") or reverted ("Revoke"). Acknowledged overlaps persist per-lorebook in `lorebook.allowedOverlaps`.

---

## Phase 6 — Search & Sort Enhancements

- Sort modes: Default, A→Z, Z→A, Last Modified.
- `lastModified` timestamp added to all entry objects; updated on every edit.
- Window size and position persist across sessions via `ui-store` and `storage-service`.
- Search results dropdown shows matched entries with location tags (title / trigger / description).
- Enter key navigates through search matches in display order.

---

## Phase 5 — Phrase Builder

- Phrase Builder mode on trigger fields: compose a trigger from individual word pills with drag reorder, then confirm or cancel.

---

## Phase 4 — Polish & Hardening

- Description highlight overlay renders search matches as a visual layer behind the textarea.
- Enter key in the search bar scrolls to the first match.
- Shift+scroll on the type selector cycles through entry types.

---

## Phase 3 — Feature Complete

- Find & Replace with duplicate-trigger deduplication after replace.
- Search highlighting across entry name, triggers, and description.
- Group-by-type view mode.
- Inline chip label editing.
- Compact trigger mode (chips collapse to a count badge).
- Suggestions engine: type-aware keyword suggestions with tray UI, reroll, and one-click add.
- Full import/export suite: JSON, TXT, DOCX, ZIP bundle.
- Import preview panel before committing an import.
- Multi-lorebook support: up to 10 lorebooks, switchable from the header.
- Settings panel: counter tiers, compact triggers, default window size, keyboard shortcuts.
- Keyboard shortcuts: Alt+N (new entry), Ctrl+Z / Ctrl+Y (undo/redo), configurable modifier keys.
- Lander (welcome screen) with import templates and getting-started guide.

---

## Phase 2 — Functional Baseline

- Draggable and resizable floating window with viewport clamping.
- Undo/redo (up to 50 snapshots of full lorebook state).
- Drag-to-reorder entries via a handle.
- Collapse/expand all entries.
- Live search across name, triggers, and description.
- Type filter bar.
- Character counter and trigger count badge with tiered color thresholds.
- Duplicate trigger prevention with flash feedback.
- Bulk paste: comma-separated list into the trigger field adds multiple triggers at once.

---

## Phase 1 — MVP

- Browser-only SPA (React 18 + Vite). No backend, no accounts.
- Entry cards with name, type selector, trigger chips, and description textarea.
- Five entry types: Character, Location, Item, Plot Event, Other — each with a distinct color.
- localStorage persistence via autosave (800 ms debounce).
- JSON export.
