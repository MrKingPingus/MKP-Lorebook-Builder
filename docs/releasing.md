# Cutting a release

The app has no backend and deploys from `main` on push, so "releasing" is mostly
bookkeeping — but the bookkeeping is what lets a bug report be traced to exact
code, and what decides whether returning users see the update notice.

## Where the version lives

`package.json` is the single source. `vite.config.js` injects it at build time as
`__APP_VERSION__`, and `src/constants/version.js` exports it as `APP_VERSION`.
The status bar and the update notice both read that, so they cannot disagree
about which build is running. **Never hardcode a version anywhere else.**

## Which number to use (decided 2026-09-03)

**0.x until CharSnap launches. Whatever version Jason ships as the live
extension becomes 1.0, and everything after it is 1.x.**

So the number is not ours to choose at 1.0 — it is set by an event outside this
repo, and MrKingPingus will say when it has happened. Until then keep counting
0.11 → 0.12 → …, and do **not** pre-empt it by cutting a 1.0 because a release
feels big enough. A 1.0 that shipped before the launch it is supposed to mark
would leave the launch build with nothing to call itself.

Tagging follows the same rule: tag each 0.x on `main` as below, and hold `v1.0.0`
until the word comes.

## The feature tour

There is nothing to generate. Since 0.10.0 the tour drives the real app rather
than showing captured images, so it has no frozen assets and no release-keyed
folder — `TOUR_RELEASE` is gone along with `verify/screenshots.mjs`.

What a release does need is a **step list for the platform it changed**, in
`src/constants/tour-steps.js`. `TOUR_STEPS_MOBILE` and `TOUR_STEPS_DESKTOP` are
independent, and an empty list means the lander and the update notice offer no
tour on that platform rather than offering an empty one. A release that changed
only one surface fills in only that list — that is the intended state, not an
oversight. **Read `docs/tour-voice.md` before writing a caption**; the first pass
was written from the changelog and read like it.

Because the tour points at live selectors, **a step whose `target` no longer
matches is a rotted step**, and the runner skips it with a console warning in
development. `npm run verify -- tour` walks the list against the real app; run it
after any change to the markup a step points at.

## Before merging

1. **Set the version** in `package.json` (e.g. `0.9.0`).
2. **Head the changelog section** `## <version> — <date>`, matching that version.
   The heading text is the identifier the update notice stores as "seen", so
   **it must not change once shipped** — editing it re-shows the notice to
   everyone who already dismissed it.
3. **If the UI moved**, check the tour still points at things that exist — see
   *The feature tour* above — and add steps for whatever this release changed.
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
