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

If a scene changes and a selector stops matching, the run prints
`!! no match for <selector>` rather than quietly producing an image with a hole
in its legend. Drag-time shots also assert the indicator actually appeared
before capturing, since those states only exist while the mouse is held.
