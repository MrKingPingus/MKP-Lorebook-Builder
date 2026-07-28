# Feature screenshots

Generated, not hand-made. Rebuild them with:

```bash
npm run dev &                  # or: vite preview against a production build
node verify/screenshots.mjs    # writes into ./screenshots
```

The script drives the real app through Playwright, builds each scene, and pins
the numbered badges to controls using their actual on-screen positions before
capturing — so an annotation can't drift from the thing it points at, and the
whole image stays sharp at 2× device scale.

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
