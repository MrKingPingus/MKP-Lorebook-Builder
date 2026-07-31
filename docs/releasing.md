# Cutting a release

The app has no backend and deploys from `main` on push, so "releasing" is mostly
bookkeeping — but the bookkeeping is what lets a bug report be traced to exact
code, and what decides whether returning users see the update notice.

## Where the version lives

`package.json` is the single source. `vite.config.js` injects it at build time as
`__APP_VERSION__`, and `src/constants/version.js` exports it as `APP_VERSION`.
The status bar and the update notice both read that, so they cannot disagree
about which build is running. **Never hardcode a version anywhere else.**

`TOUR_RELEASE` in `src/constants/tour-steps.js` is deliberately *not* the app
version: it names which folder of screenshots to serve. A version bump with no
new captures must leave it alone, or the tour points at a folder that doesn't
exist.

## Before merging

1. **Set the version** in `package.json` (e.g. `0.9.0`).
2. **Head the changelog section** `## <version> — <date>`, matching that version.
   The heading text is the identifier the update notice stores as "seen", so
   **it must not change once shipped** — editing it re-shows the notice to
   everyone who already dismissed it.
3. **If the UI moved**, regenerate the tour screenshots and commit them:
   ```bash
   npm run dev &
   node verify/screenshots.mjs      # writes public/screenshots/<TOUR_RELEASE>/
   ```
   Bump `TOUR_RELEASE` first if this release should get its own frozen set. See
   `screenshots/README.md`.
4. **`npm run build` and `npm run verify`** both clean.

## After merging

Tag the merge commit on `main` — not the branch tip, which is not what shipped:

```bash
git checkout main
git pull origin main
git tag -a v0.9.0 -m "0.9.0 — interface overhaul"
git push origin v0.9.0
```

Then, optionally, a GitHub Release: **Releases → Draft a new release**, choose
the `v0.9.0` tag, and paste that version's changelog section as the body. The
release page is what makes a version citable to someone who isn't in the repo;
the tag alone is enough for `git checkout v0.9.0`.

## Why bother

Without a tag, "v0.9.0" in a bug report identifies every commit that carried that
version number — dozens by the end of a phase. With one, it identifies exactly
one. Adding a tag later means finding the right commit by hand, which is the only
part of this that gets harder with time.
