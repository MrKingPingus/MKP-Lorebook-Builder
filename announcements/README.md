# Announcements

Release posts, as published. **Not documentation — do not maintain these.**

Each file describes one release at the moment it shipped and is left alone
afterwards, the same way the release's screenshots under
`public/screenshots/<release>/` are frozen once captured. A post that says
something the app no longer does is correct: it was true of that release.

That distinction is the whole reason this folder exists. `0.9.0-ui-overhaul.md`
lived in `docs/` first, where being surrounded by maintained references implied
it was one, and it quietly went stale — describing an ordering the app had
already reversed.

**If you're looking for what's true now**, use `CHANGELOG.md`, the reference docs
in `docs/`, or the app's own *What's new* panel.

## Writing one

Same rule the changelog follows: **describe the delta from the last released
version, not from the last commit.** If a user could not have experienced the old
behaviour, it isn't a change — a fix to something that never shipped is invisible
to everyone outside this repo, and listing it just buries the parts that matter.

Screenshots come from `verify/screenshots.mjs` (see `screenshots/README.md`).
Embed them from `public/screenshots/<release>/` and repeat the numbered labels
from `src/constants/tour-steps.js` underneath, in array order — the badges drawn
on the images carry no captions of their own.
