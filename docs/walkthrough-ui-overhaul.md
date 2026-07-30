# What's changed — the interface overhaul

A tour of the largest UI pass the builder has had. Nothing about your lorebooks
has changed: same data, same file formats, same storage. This is entirely about
where the controls live and how you get to them.

**The short version.** The window header has been emptied out down to the
essentials. The lorebook title is now a menu that carries your books and your
import/export. The hamburger is a gear that opens Settings in one click.
Everything that's a *readout* rather than an *action* moved to a new status bar
along the bottom, including a single menu for every size setting. Settings went
from six sections to four and gained a filter box. And there's a pull tab on the
right edge that opens your lorebook list beside your entries.

If you'd rather have the old menus back, there's a setting for that — see
[Coming from the old layout](#coming-from-the-old-layout) at the end.

---

## The idea behind it

Two rules decide where any control lives now, and they explain most of what
follows:

- **The hotbar is for things you *do* to your lorebook** — add, undo, import,
  export. It was always this, and it hasn't changed.
- **The status bar is for things that are simply *true*** — whether you're
  saved, how many entries you have, how much storage you're using, how big
  everything is drawn.

Anything that isn't an action on your content should not be competing for space
with the actions. That's why the header emptied out.

---

## The header

<!-- SCREENSHOT: header-before-after — the old header (logo, name field, count,
     Switch, feedback icons, storage ring, hamburger, close) above the new one
     (logo, title field, gear, close) -->

The header used to hold eight things. It now holds four: the logo, the lorebook
title, a gear, and close.

Everything that left is still here — it moved to the status bar at the bottom of
the window, which is covered further down.

---

## The lorebook title is a menu

<!-- SCREENSHOT: title-menu-browse — menu open, both columns visible, badges on:
     (1) the book list, (2) the active book, (3) + New lorebook,
     (4) the import drop zone, (5) export buttons, (6) templates -->

Click the title and a menu drops down in two columns.

**On the left: every lorebook you've saved.** Click one to switch to it. The
active book is marked. **+ New lorebook** sits at the foot of the list. To delete
one, hover its row and click the **×** — you'll be asked to confirm first.

The list is **alphabetical, and it stays that way.** This is deliberate and worth
knowing: the old list re-sorted itself by whatever you touched last, which meant
the book you wanted was never in the same place twice. Alphabetical is boring, and
boring is the point — muscle memory works now.

**On the right: import and export.** Drop a file, download in any format, grab a
blank template. All of it without opening a panel somewhere else.

### Three ways it behaves

- **Hover** and the menu surfaces on its own. Move away and it goes.
- **Click** and it pins open until you click again.
- **Double-click** and the title becomes an editable field so you can rename the
  book.

The hover-and-pin behaviour is the same as the `⤢ Size` button in the status bar,
so the two controls that open menus both work the same way.

Renaming moved to a double-click because the title used to be a permanently live
text field — easy to edit by accident, and a poor thing to click when what you
wanted was a menu.

---

## Importing

<!-- SCREENSHOT: import-disposition — the title menu mid-import, book list
     collapsed to the rail, badges on: (1) the file name and entry count,
     (2) the four choices, (3) the rail's back arrow -->

Drop a file onto the title menu and the lorebook list slides aside so the import
gets the whole panel. Nothing opens anywhere else.

Once the file is read, you're asked what should happen to the book you have open:

| Choice | What happens |
|---|---|
| **Import as new** | Goes into a brand-new lorebook. Your current one is untouched. |
| **Append** | Added to your current lorebook. |
| **Replace** | Overwrites your current lorebook's entries. |
| **Back up first** | Downloads a copy of your current book, then replaces it. |

<!-- SCREENSHOT: import-preview — the preview list with the disposition banner
     and the Back / confirm buttons -->

Then you get a preview of every entry about to land, and a banner spelling out
exactly what confirming will do. **Back** returns you to the four choices without
making you pick the file again.

### The part that actually changed

**All four choices are now available wherever you start an import.** They weren't
before, and the inconsistency was invisible until it bit you:

- The old side panel had the backup option, but couldn't take pasted text.
- The old hotbar Import had pasted text, but no backup option — and it made you
  pick *paste / entries from a file / whole book* before you'd even chosen a file.

Which surface you happened to open decided what you were allowed to do. Both now
run the same flow, so it doesn't matter where you start.

**Pasted entries can do anything a file can.** Paste used to only ever append to
the open book. It reaches all four choices now, and lives behind an **or paste
entries instead** link next to the drop zone.

**Backups are always JSON.** You could previously choose TXT, which is a lossy
format — it doesn't carry your triggers. That's a bad thing to discover about a
backup *after* you've overwritten the original.

---

## Settings

<!-- SCREENSHOT: settings-sections — Settings open, all four sections collapsed,
     badge on the gear and on the filter box -->

The gear in the top-right opens Settings directly — no dropdown in between.
**Ctrl+,** does the same.

It opens as **four collapsed sections**, so you see four headings and nothing
else rather than a wall of controls to scroll past:

| Section | What's in it |
|---|---|
| **Editing & Entries** | Writing aids, counters, entry badges, entry history |
| **Appearance & Accessibility** | Themes and custom colours, text size, reduced motion, high contrast |
| **Layout & Controls** | Keyboard shortcuts, hotbar, FAB menu, folders, reference panel, navigation |
| **System** | Browser storage limit |

This replaces six sections that had grown up around whichever feature happened to
introduce each setting. Nothing changed meaning or default — things are just
where you'd look for them. Inside each section, labelled runs (*Writing aids*,
*Counters*, *Entry badges*) break a long list into a few short ones.

### The filter box

<!-- SCREENSHOT: settings-filter — "hotkey" typed, panel narrowed to the
     keybinding editor -->

Type what you're after and the panel narrows to those controls, opening whichever
section holds them.

It matches words that **aren't in the visible label**, which is the whole reason
it's useful: "hotkey" finds **Keyboard shortcuts**, "dark mode" finds the theme
picker. Extra words narrow rather than widen, so `storage safari` is more
specific than `storage`. It stays pinned to the top while you scroll.

---

## The status bar

<!-- SCREENSHOT: status-bar — badges on: (1) save readout, (2) entry count,
     (3) feedback icons, (4) storage ring, (5) ⤢ Size -->

A thin bar along the bottom of the window, below the hotbar.

- **Save state** — reads **Saved** the moment a save lands, then ages into
  **Saved 4m ago** so you can tell at a glance nothing is stuck. Hover for the
  exact time.
- **Entry count**, and a **hidden count** when you have entries excluded from
  export. Click the hidden count to manage them.
- **Report a bug / request a feature** — the two icons.
- **Storage ring** — how much of your browser's storage the app is using. Hover
  for a summary, click for a full breakdown.
- **`⤢ Size`** — every sizing control, covered next.

---

## One menu for every size setting

<!-- SCREENSHOT: size-menu — the Size menu open with the window-size submenu
     flown out to the right -->

Window size, text size, entry height and the **+** button's size used to be
scattered across three different Settings sections. They're all in the `⤢ Size`
button in the bottom-right corner now, each showing its current value so you can
read your settings without opening anything.

| Control | Notes |
|---|---|
| **Window size** | Named presets, or **Custom…** to type exact numbers. **Save as default** makes the current size what **Reset to default** returns to. |
| **Text size** | Also stays in Settings → Appearance & Accessibility, because that's where people who rely on it look. Change it in either place and the other follows. |
| **Entry height** | How tall entry headers are drawn. |
| **FAB size** | Size of the **+** button. |

**Reset all sizing** puts the window, entry height and FAB back to normal. It
deliberately **leaves your text size alone** — that's an accessibility setting
you may be depending on, and wiping it from a general reset would be hostile.

The button surfaces on hover and pins on click, same as the lorebook title. A
pinned button is outlined so you can tell which mode you're in.

---

## The pull tab

<!-- SCREENSHOT: pull-tab — closed state and open state side by side, showing
     the window widening rather than the list being covered -->

There's a tab on the right edge of the window. Click it and your lorebook list
opens as a side panel.

The important bit: **the window widens to fit the panel** rather than the panel
taking space from your entries. Your list stays exactly as wide as it was, and
nothing you were reading gets covered. Click the tab again to tuck it away.

The tab sits on the *outside* of the window frame, so your entry rows run all the
way to the border. The window stops just short of the screen edge to leave the tab
somewhere to sit, so it can't be pushed off-screen even at full size.

Opening and closing eases rather than snapping, and your entry list holds
perfectly still while it happens.

---

## Smaller things

- **The default window is much bigger — 1200×900, up from 760×620.** The old one
  was cramped, especially with the reference panel open. If you never picked a
  size of your own, yours updates automatically. If you did, your choice is left
  exactly as you set it.
- **Custom window size boxes are typeable again.** Entering a number used to snap
  the field to its smallest or largest value, because every keystroke was being
  clamped before you could finish. Values apply when you press Enter or click
  away now, so `1360` stays `1360`.
- **Storage popovers open upwards**, now that the storage ring lives at the
  bottom of the window instead of the top.
- **Clicking the lorebook title a second time closes the menu.** It used to do
  nothing at all.
- **"Entry header" is now "Entry height"**, which reads better.
- **The `?` cheat sheet** lists every shortcut, and its *Edit shortcuts* link
  goes straight to the keybinding editor in its new home.

---

## Coming from the old layout

**Nothing about your data changed.** Same lorebooks, same entries, same JSON, same
browser storage. You don't need to export or re-import anything.

**Where things went:**

| If you're looking for | It's now |
|---|---|
| The **☰** menu | A gear, opening Settings directly |
| The **Lorebooks** tab | The lorebook title menu, or the pull tab |
| The **Import / Export** tab | The right column of the lorebook title menu |
| Renaming a lorebook | Double-click the title |
| Switching lorebooks | The title menu, or the pull tab |
| Default window size · FAB size · entry height | The `⤢ Size` menu |
| Keyboard shortcuts in Settings | Settings → Layout & Controls, at the top |
| Entry count · storage ring · feedback links | The status bar along the bottom |

**Want the old menus back?** Settings → Layout & Controls → Navigation → **Legacy
menus**. Turning it on restores the **☰** header menu with Lorebooks, Import /
Export and Settings as side panels. Those panels never went away — the setting
only decides whether the header offers a route to them.

**On phones**, none of this has landed yet. The status bar, the title menu and the
pull tab are desktop-only for now; the phone layout has its own pass coming, since
it has different constraints and deserves a proper look rather than a squeezed
version of the desktop answer.
