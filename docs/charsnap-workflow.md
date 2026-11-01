# CharSnap workflow — one codebase, two destinations

**Read this before any session that touches Jason's repo.** It is the procedure
for keeping this builder in step with the copy that lives in
`JasonYCao/charsnap-extensions`, written 2026-11-01 after three vendoring passes
had each re-derived it from memory, and two had got part of it wrong.

## The shape

There is **one codebase**: this repo, `MrKingPingus/MKP-Lorebook-Builder`. It
goes to two places:

| Destination | What it is | How it gets there |
|---|---|---|
| **Our users** | GitHub Pages, deployed from `main` by `.github/workflows/main.yml` | Merge a working branch into `main` |
| **CharSnap** | `JasonYCao/charsnap-extensions`, folder `mkp-lorebook-builder/`, which Jason deploys | A PR from the fork `MrKingPingus/charsnap-extensions` |

And one thing comes **back**: Jason edits his copy too (host mode in September,
trigger conditions after it). Those changes are merged in here, never re-typed.

So there are not two builds. CharSnap embeds the same build, and host mode
(`HOST-MODE.md`) only switches on when the URL carries `?host=charsnap` **and** the
page is framed. The standalone app is unaffected, and `verify/host-checks.mjs`
has a scenario that proves it.

**Never edit `mkp-lorebook-builder/` in the fork by hand.** It is overwritten
wholesale on every publish (step 3), so a hand edit there is lost.

## The order: sync, then ship, then publish

**Always sync before you publish.** Publishing replaces his folder wholesale with
ours. If his latest changes are not merged in here first, publishing would
quietly undo his work.

### 1. Sync — bring Jason's changes in

The containers are fresh each session, so run `npm install` first. Then:

```bash
SRC=/home/user/charsnap-upstream-src
GIT_LFS_SKIP_SMUDGE=1 git clone -q --depth 5 https://github.com/JasonYCao/charsnap-extensions $SRC

# The tracking branch is rebuilt from history each time rather than pushed:
# start from the newest sync reachable from the working branch.
BASE=$(git log --format='%h %s' | grep -m1 -E ' (Sync|Import CharSnap host mode from) charsnap-extensions@' | cut -d' ' -f1)
git checkout -B charsnap-upstream $BASE

# Replace everything his tree owns. Keep the paths his copy never carries.
git ls-files -z | grep -zvE '^(\.github/|CLAUDE\.md$|docs/|announcements/|mockup\.html$)' | xargs -0 git rm -q
git -C $SRC archive HEAD mkp-lorebook-builder | tar -x --strip-components=1
git add -A
git commit -m "Sync charsnap-extensions@$(git -C $SRC rev-parse --short HEAD)"

git checkout <working-branch>
git merge charsnap-upstream      # three-way; base = the last sync
```

If the sync commit is empty, he has changed nothing and there is nothing to merge.

Why this works: the tracking branch shares history with ours. Each merge's base
is therefore the previous sync, and git sees **only what he changed since then**.
In September this resolved 7 of 11 overlapping files unaided. Syncing his
2026-09-29 commit produced exactly his 21-file delta, and only one file
(`EntryCard.jsx`) conflicted.

Conflicts to expect, and how to settle them:

- **`README.md`.** His copy's README is our `docs/charsnap-deployment.md`. Keep our
  README. If he edited his, carry the edit into `docs/charsnap-deployment.md`.
- **`CHANGELOG.md`, `verify/run.mjs`.** Both sides append. Keep both.
- **Import blocks.** Both sides add imports. Keep both.

Then run `npm run build` and the full `npm run verify`, which includes his host
suites, before committing the merge.

### 2. Ship to our users

Open a PR from the working branch into `main` on this repo. Merging it deploys to
Pages. Version and changelog bookkeeping is in `docs/releasing.md`. Versions stay
0.x until CharSnap launches; that launch becomes 1.0.

### 3. Publish to CharSnap

Only after step 1 has merged his latest:

```bash
FORK=/home/user/charsnap-fork
git clone -q https://github.com/MrKingPingus/charsnap-extensions $FORK
git -C $FORK remote add upstream https://github.com/JasonYCao/charsnap-extensions
git -C $FORK fetch -q upstream main
git -C $FORK checkout -b update-builder-vX.Y.Z upstream/main

rm -rf $FORK/mkp-lorebook-builder && mkdir $FORK/mkp-lorebook-builder
git archive HEAD | tar -x -C $FORK/mkp-lorebook-builder \
  --exclude=.github --exclude=CLAUDE.md --exclude=docs \
  --exclude=announcements --exclude=mockup.html
cp docs/charsnap-deployment.md $FORK/mkp-lorebook-builder/README.md

git -C $FORK add -A
git -C $FORK diff --cached --stat -- '*host*'   # should be empty unless we meant to touch host mode
git -C $FORK commit -m "Update MKP Lorebook Builder to vX.Y.Z"
git -C $FORK push origin update-builder-vX.Y.Z
```

A session cannot open the PR against Jason's repo, because his repo is not attached
to it. Hand the user this link to open it:
`https://github.com/JasonYCao/charsnap-extensions/compare/main...MrKingPingus:update-builder-vX.Y.Z?expand=1`

**Before publishing, check two things.** First, the newest `Sync charsnap-extensions@<sha>`
commit in our history matches his current main (`git ls-remote
https://github.com/JasonYCao/charsnap-extensions refs/heads/main`). Second, the
`*host*` diff above is empty. If either check fails, stop.

What the copy leaves out, and why: `.github/` (our Pages deploy), `CLAUDE.md` and
`docs/` (our working notes; the code cites `docs/plan.md`), `announcements/` and
`mockup.html` (ours only).

## Where things stand (2026-11-01)

- **Working branch** `claude/entry-features-ui-6hyigc`: 0.11.0 + host mode. Not on
  `main`. The user has not yet hands-on tested 0.11.0. A private test build is at
  https://claude.ai/artifact/634X4krBhDCrCS9bii3bpQ
- **`main`**: still 0.10.0, so our users have not seen 0.11.0.
- **Jason's main** `363694a` (2026-09-29, trigger condition + always-on): synced
  as far as a tracking commit, but **not merged** into the working branch. Do
  step 1 to bring it in. Expect one conflict, in `EntryCard.jsx`.
- **PR #3** (`JasonYCao/charsnap-extensions#3`, opened 2026-09-03): still open, and
  built on `b35da60`, which is behind his main. Republish it via step 3 after the
  sync.
- **Open question for Jason:** copy/move-to-lorebook under host mode. The protocol
  only knows one book, so "Open that lorebook" can retarget his save. See
  `docs/plan.md` → *CharSnap host mode, and the one thing it cannot express*.
