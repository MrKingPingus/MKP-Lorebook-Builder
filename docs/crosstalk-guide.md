# Crosstalk: Working With Two Lorebooks at Once

## What it is

Crosstalk lets you keep a second lorebook open beside the one you're editing. The book on the right is read-only — you can look at its entries, see how they overlap with what you're building, and lift things from it into your own book — but typing always happens on the left.

When you click anywhere on the right panel (except an expanded "desc"), the two books swap places: the book you clicked becomes editable and the one you were just editing slides over to the right. So you're never locked out of either; you always edit whichever side you're pointing at.

## Turning it on

Crosstalk is off by default. There are three places to switch it on, all of which do the same thing:

- The **Lorebooks** panel in the menu has a "Select Reference Lorebook" button at the top
- The hotbar has a **Reference** action (the ⇆ icon). This must be added manually by navigating to the settings/hotbar slots section (currently at the bottom of the page)
- The Settings panel has a "Show reference panel" toggle

When crosstalk is on, the editor splits into two columns. Until you pick a reference book the right column will tell you to choose one.

## Picking a reference lorebook

Use the dropdown at the top of the reference panel. It lists every lorebook you have except the currently active one. Picking nothing is fine; the panel will sit empty.

The reference pick resets between sessions — pick again if you reopen the app and want the same pairing back.

## Looking at entries

The reference panel renders the same entries the active panel does, but compacted: type dot, name, triggers, and a stats badge. There's no description body and no editable fields — that's deliberate.

Click the **▼ Desc** button on any card to reveal the description inline below the trigger row. Click again to hide. The cursor turns into a text I-beam inside the description so you can select and copy. This is the one place inside the reference panel where a click does *not* swap the panels.

## Swapping sides

Click anywhere on the reference panel's entry list and the two panels trade places — the reference book becomes the active book, and vice versa. This is the main way to start editing a reference book: click it, it pivots in, you edit.

The picker dropdown, the Desc button, and any expanded description body all opt out of swap, so you can interact with those without committing to a pivot.

## Trigger conflicts across books

When the same trigger word appears in two different entries — whether both in the active book, both in the reference book, or one in each — the trigger gets a colored ring:

- **Yellow ring** = conflict. The two entries will both fire on this trigger and you probably want to fix that.
- **Blue ring** = acknowledged. You've told the app this overlap is intentional.

Hover a ringed trigger in the active panel to see a popover listing the other entries it overlaps with. When the conflict spans both books, the popover groups them under "This lorebook" and "Reference lorebook" headers. Click an entry in the popover to scroll to it; if the entry lives in the reference book, the panels swap first so you land on it editable.

The popover has two buttons:

- **Allow overlap** — marks this trigger as intentional. The ring turns blue. When the conflict spans both books this writes to both books at once, so the acknowledgement stays consistent if you swap.
- **Revoke** — un-acknowledges the overlap. The ring goes back to yellow.

Trigger crosstalk works the same way without a reference book picked — it just only sees the active book in that case.

## Find / Replace across books

When crosstalk is on with a reference picked, the find/replace popover shows three apply buttons instead of one:

- **Apply to Active** — replaces in the editable book only
- **Apply to Reference** — replaces in the reference book only
- **Apply to Both** — replaces in both at once

The match preview above the buttons lists which entries matched and how many hits each one has, so you can see exactly what's about to change before you click.

## Copying entries between books

To move a batch of entries from one book to the other:

1. Switch the search bar mode to **Select**.
2. Click cards on whichever side you want to copy *from*. Selected cards lift slightly and brighten.
3. A **Copy to Active** or **Copy to Reference** button appears in the bulk action bar — its label tracks the side you're copying from, so the destination is always the other panel.
4. Click it. The selected entries get cloned (fresh ids, no rollback history) and appended to the destination book. Selection clears and select mode exits.

You can only hold a selection on one side at a time. If you click a card on the opposite side mid-selection, the existing selection clears and a new one starts on the side you just clicked.

## Limitations

A few things to know, especially while this is in beta:

- **Undo across books is limited.** Each book has its own rollback history. Cross-book operations — find/replace into reference, copy-to-reference — don't snapshot the destination book. Undo on the active side won't reach over to the reference side.
- **The reference pick is not saved.** Whether crosstalk itself is on or off persists between sessions, but which book is currently in the reference slot does not.
- **Cross-book conflict scanning needs both halves.** Crosstalk has to be on with a reference picked for the trigger conflict system to see across both books. If you turn crosstalk off, you'll only see same-book conflicts again until you turn it back on.
- **Mobile is hilariously undertested and underdeveloped**. I straight up didn't test the mobile version. I'll be dedicating some dev time to it eventually, but I would use it at your own risk. 

That's the whole feature. Try it on a duplicate copy of a lorebook first before depending on it for important data.
