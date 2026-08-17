# Writing tour copy

The guided tour is the only place in the app where we are *selling* rather than
labelling. Its copy is read once, by someone holding a phone, who has already
decided to give us thirty seconds. That audience makes almost every instinct
from the rest of the codebase wrong.

This exists because the first pass got it wrong in a specific, repeatable way:
the captions were written from `CHANGELOG.md`, and changelog voice is engineering
voice. Entries like *"everything you tap carries a full-sized touch target"* and
*"the chrome above your first entry went from 236px to 170px"* are accurate,
useful, and meaningless to the person the tour is for.

## The rules

**1. Say what they get, not what we did.** "The chrome went from 236px to 170px"
is our achievement. "You see more of your entries" is their benefit. Ship the
second one.

**2. No jargon, and the bar is lower than you think.** *Chrome*, *touch target*,
*hit area*, *breakpoint*, *viewport*, *layer*, *popover*, *derived*, *px* — none
of these belong in a caption. Neither do our internal names for things unless the
user can see that name on screen.

**3. No comparisons to a version they may never have used.** "This was
unreachable on a phone before" tells a new user nothing and tells a returning
user that we shipped something broken. A tour is not the place to apologise. If
the old behaviour genuinely helps them understand the new one, one short clause
is the budget — and check the claim is even true before making it.

**4. Point at what is on screen, in the words that are on screen.** If the button
says **Filter**, the caption says Filter. Slide 3's first draft said "search,
mode and filters share a row" when what a user can see is *two* controls, because
search and its mode are one dropdown. Describe the picture, not the code behind
it.

**5. One idea per step.** If a caption needs a semicolon and a list, it is two
steps or it is one step with less in it. The tour is not a feature inventory.

**6. Invite the tap.** The tour's whole point is that the highlighted thing
really works. Where a step is worth trying, say so plainly — "Give it a tap" —
and let `advanceOn` carry them forward. A caption that only describes is a
caption that could have been a screenshot.

**7. Under 220 characters, and under 160 is better.** Not a style preference:
the caption bubble is placed by a flip heuristic that only holds while the bubble
is shorter than half the screen, and a long caption is how it ends up covering
the thing it points at. See `src/constants/tour-steps.js`.

**8. Warm, plain, unhurried.** Contractions are fine. Second person throughout.
No exclamation marks, no "simply", no "just", no "powerful", no "seamlessly".

## A worked example

The changelog entry, which is correct and belongs in the changelog:

> **A phone gives you far more of your entries and far less toolbar.** The filter
> controls now share a row instead of stacking three deep, and the chrome above
> your first entry is down from 236px to 170px on a small phone — from 46% of the
> screen to 35%.

The tour caption, which says the part the user cares about:

> **More room for your entries.** Searching and filtering used to take up three
> rows. Now it's one, so you see more of your work and less of the toolbar.

Same fact. One of them is for us.
