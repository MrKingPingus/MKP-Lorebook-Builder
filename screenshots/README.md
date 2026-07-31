# Feature screenshots

Generated, not hand-made. Rebuild them with:

```bash
npm run dev &                  # or: vite preview against a production build
node verify/screenshots.mjs    # writes into public/screenshots/<release>/
```

## Where they go, and why they're committed

Output lands in `public/screenshots/<TOUR_RELEASE>/`, which is **not** gitignored:
the in-app feature tour serves these images, so they have to be in the build.
They're namespaced by release because a release's set is captured once and then
frozen — the 0.9.0 images stay correct for 0.9.0 however far the UI moves on.
That turns staleness from a bug into an archive.

This directory (`screenshots/`) is scratch output only, and stays ignored. Pass
a path argument to write here instead: `node verify/screenshots.mjs screenshots`.

## The steps are shared

`src/constants/tour-steps.js` is the single source: the generator reads it to
know which scenes to build and what to name the files, and `FeatureTour.jsx`
reads it to know what to show. A step with no matching scene, or a scene with no
matching step, is reported at the top of a run rather than silently skipped.

## How the annotation works

The script drives the real app through Playwright, builds each scene, and pins
numbered badges to controls using their actual on-screen positions before
capturing — so an annotation can't drift from the thing it points at, and the
whole image stays sharp at 2× device scale.

2× is deliberate: the tour displays them scaled down, but clicking a shot
enlarges it, and that is where the extra detail is spent.

**Only the badges are drawn into the image.** The labels live in
`TOUR_STEPS[].marks` and are rendered as HTML by the tour. Painted into the PNG,
the legend was pinned to the window's bottom edge — so it covered whatever the
shot was about whenever that sat low (the sizing menu, for one), and it
disappeared the moment anyone enlarged the image, taking the explanation with
it. As HTML it sits outside the image, survives enlarging, scales with the
text-size setting, and can be read by a screen reader.

### Numbering comes from the array, and only from the array

Badge `i + 1` is drawn for `marks[i]`. The tour renders the same array as a
numbered list counting from 1, so the two agree by construction and nothing in
the generator may reorder them. An earlier version sorted the marks into reading
order *before* numbering them, and every badge on a step ended up pointing at a
different label than its number — badge 3 sat on "Append" while the list's item
3 described "Replace".

That means the marks have to be *written* in the order they scan on the image.
The run checks this and prints the order to use when they disagree:

```
status-bar:
  !! badges scan 2, 1, 3, 4, 5, 6 — reorder this step's marks to match
```

`place` is the lever for moving a badge; the array position is the lever for
renumbering it. Changing one to fix the other is what goes wrong.

### Where a badge lands

A badge tucks against a corner of its own ring, outside it — `place` names the
preferred corner (`tl` `tr` `bl` `br`). Pinned to the midpoint of an edge, as
they were at first, badges landed on whatever sat beside the target: the
neighbouring cell of the 2×2 import grid, the label of the next status item. For
a target at the window's left edge the badge fell outside the frame entirely.

Every corner is scored, so `place` is a preference rather than an instruction. A
badge that would cover another marked control, sit on another badge, or land
outside the shot moves to a free corner by itself — which is why the Settings
step's second badge sits below-left: both top corners would have covered the
filter box above it.

### Cropping

`CROPS` in the generator narrows a shot vertically to the part of the window the
step is about, keyed by step id: `{ top, bottom }` are selectors and
`padTop`/`padBottom` keep some surrounding window for context. Full width is
always kept, so a cropped shot still reads as a band across the builder rather
than a floating fragment.

Without this every step was the whole 1200×900 window regardless of its subject.
The status-bar step was a 40px strip along the bottom of a 900px-tall picture of
an entry list: the subject was in frame, but nobody could see it.

### Each scene starts from an empty browser

The generator drives one long-lived page and lorebooks persist in
`localStorage`, so scenes inherit each other's books. Left alone, the last shot
listed eight near-identical copies of the same fixture in a panel meant to show
you your library.

**The window is pinned to its default size before every capture.** Bootstrap
sizes a first-run window from the viewport (two thirds of its width, its full
height), so captures were of a window no user's default looks like — and the
extra height is what made them too tall to read in the tour. `useDefaultWindow`
picks the Medium preset through the real UI, so the shots track the default if
it changes.

The capture clip unions the app window, any portalled menu, *and* every badge
and ring, since annotations sit outside their targets by design and would
otherwise get sliced off at the edge. The same list of portals bounds badge
placement, so a badge belonging to something outside the window — the pull tab —
isn't judged out of bounds.

If a scene changes and a selector stops matching, the run prints
`!! no match for <selector>` rather than quietly producing an image with a hole
in its legend. Drag-time shots also assert the indicator actually appeared
before capturing, since those states only exist while the mouse is held.
