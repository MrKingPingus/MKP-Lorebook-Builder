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

Badges are numbered in **reading order** — top to bottom, left to right within
a row — not in the order the marks happen to be listed in the script, and the
legend is emitted in that same order. Numbering by source order produced images
whose badges ran 3, 2, 1 down the page while the legend counted up.

The capture clip unions the app window, any portalled menu, *and* every badge
and ring, since annotations sit outside their targets by design and would
otherwise get sliced off at the edge.

If a scene changes and a selector stops matching, the run prints
`!! no match for <selector>` rather than quietly producing an image with a hole
in its legend. Drag-time shots also assert the indicator actually appeared
before capturing, since those states only exist while the mouse is held.
