# CharSnap workflow — one codebase, two destinations

**Read this before any session that touches Jason's repo.** It is the procedure
for keeping this builder in step with the copy that lives in
`JasonYCao/charsnap-extensions`. The procedure is also a script,
`scripts/charsnap.sh`. Use the script, not hand-typed commands: it checks every
precondition below and refuses, with the reason, when one fails.

## The three commands

```bash
npm install                            # containers are fresh each session
npm run charsnap:status                # 1. FIRST, every session: where things stand
npm run charsnap:sync                  # 2. bring Jason's latest changes in
npm run charsnap:publish -- X.Y.Z      # 3. put this build on the fork for a PR to Jason
```

| Command | What it does | It refuses when |
|---|---|---|
| `status` | Compares Jason's `main` with the last sync this branch contains. Lists branches with work that isn't on our `main` yet, and the fork's publish branches. Read-only. | It isn't run in `MrKingPingus/MKP-Lorebook-Builder` |
| `sync` | Rebuilds the `charsnap-upstream` tracking branch from the last sync, overlays Jason's `mkp-lorebook-builder/`, commits it as `Sync charsnap-extensions@<sha>` and merges it into the current branch. Does nothing when already in sync. | The tree is dirty; HEAD is detached or on the tracking branch; the branch contains no sync at all; Jason's `main` moves mid-sync; his folder is gone |
| `publish` | Cuts `update-builder-vX.Y.Z` from Jason's `main` in the fork, replaces his folder with this build, and pushes it to the fork. Prints the link for opening the PR. | The version doesn't match `package.json`; the branch is behind Jason; HEAD isn't pushed to `origin`; the tree is dirty; Jason's host-mode files would change |

After `sync`, run `npm run build` and the full `npm run verify` (it includes
Jason's host suites) before pushing. On a conflict the script stops and leaves
the merge for you to settle. The usual conflicts are listed under
[Conflicts](#conflicts).

## How a session should start

1. **Start the session on `MrKingPingus/MKP-Lorebook-Builder`.** Never on
   `charsnap-extensions` (Jason's repo or the fork). That copy's
   `mkp-lorebook-builder/` folder is overwritten on every publish, so work done
   there is lost. If `status` says it is in the wrong repo, stop.
2. **Run `npm run charsnap:status`.** If it says **BEHIND**, run
   `npm run charsnap:sync` before anything else.
3. **If you are on `main` and `status` lists another branch with unmerged
   work**, decide which to continue before touching anything. A new session
   starts on `main`, which does not contain work that hasn't been merged yet.

## The shape

There is **one codebase**: this repo, `MrKingPingus/MKP-Lorebook-Builder`. It
goes to two places:

| Destination | What it is | How it gets there |
|---|---|---|
| **Our users** | GitHub Pages, deployed from `main` by `.github/workflows/main.yml` | Merge a working branch into `main` (a PR) |
| **CharSnap** | `JasonYCao/charsnap-extensions`, folder `mkp-lorebook-builder/`, which Jason deploys | `charsnap:publish`, then a PR from the fork `MrKingPingus/charsnap-extensions` |

And one thing comes **back**: Jason edits his copy too (host mode in September,
trigger conditions and always-on after it). Those changes are merged in here
with `charsnap:sync`, never re-typed.

So there are not two builds. CharSnap embeds the same build, and host mode
(`HOST-MODE.md`) only switches on when the URL carries `?host=charsnap` **and** the
page is framed. The standalone app is unaffected, and `verify/host-checks.mjs`
has a scenario that proves it.

## The order: sync, then ship, then publish

**Always sync before you publish.** Publishing replaces his folder wholesale with
ours. If his latest changes aren't merged here first, publishing quietly undoes
his work. `publish` enforces this, so a publish can't run behind his `main`.

### Shipping to our users

Open a PR from the working branch into `main` on this repo. Merging it deploys to
Pages. Version and changelog bookkeeping is in `docs/releasing.md`. Versions stay
0.x until CharSnap launches; that launch becomes 1.0.

### Publishing to CharSnap

A session can't open the PR against Jason's repo, because his repo isn't
attached to it. `publish` prints the compare link for the user to open. The fork,
`MrKingPingus/charsnap-extensions`, must be attached to the session with push
access.

If `update-builder-vX.Y.Z` already exists on the fork, `publish` replaces it. That
is how an open PR gets refreshed: the branch is generated, never edited, and
the PR updates in place.

## Why the sync works

The tracking branch starts at the previous sync commit, which is in our history.
So the merge is three-way with that sync as its base, and git sees **only what
Jason changed since**. In September this resolved 7 of 11 overlapping files
unaided. In November it merged his `363694a` (21 files) with one conflict.

The script finds the previous sync by subject line: the newest commit reachable
from HEAD whose subject matches `Sync charsnap-extensions@<sha>` (or the first
import's `Import CharSnap host mode from charsnap-extensions@<sha>`). **Never
reword or squash those commits.** They are how every later sync finds its base.

Paths that are ours alone are never deleted by a sync and never copied by a
publish: `.github/` (our Pages deploy), `CLAUDE.md` and `docs/` (our working
notes; the code cites `docs/plan.md`), `announcements/`, `mockup.html` and
`scripts/`. The two lists live at the top of `scripts/charsnap.sh`; keep them
in step.

His folder's README is our `docs/charsnap-deployment.md`, copied in by `publish`.

## Conflicts

- **`README.md`.** His copy's README is our `docs/charsnap-deployment.md`. Keep our
  README. If he edited his, carry the edit into `docs/charsnap-deployment.md`.
- **`CHANGELOG.md`, `verify/run.mjs`.** Both sides append. Keep both, and check
  that his entry still describes where things are after the merge.
- **Import blocks.** Both sides add imports. Keep both.
- **A control he added somewhere we moved things out of.** In November he added
  an Always on button to the entry footer that we had emptied into the ⋯ menu.
  It went into the ⋯ menu with the rest. Keep his feature and our layout.
- **His new entry fields vs. our newer features.** After a sync, check that the
  new fields travel through everything built since his last sync. Copy/move
  clones the whole entry, so new fields travel; templates hold a fixed list of
  fields (`TEMPLATE_FIELDS`), so they don't.

## Where things stand (2026-11-10)

- **Working branch** `claude/entry-features-ui-6hyigc`: 0.11.0, Jason's
  `363694a` merged in. **Not on `main` yet.** The user is hands-on testing a
  private build at https://claude.ai/artifact/634X4krBhDCrCS9bii3bpQ
- **`main`**: still 0.10.0, so our users haven't seen 0.11.0.
- **Jason's main** `363694a`: in sync.
- **PR #3** (`JasonYCao/charsnap-extensions#3`, head
  `MrKingPingus:update-builder-v0.11.0`): still open, built on his older
  `b35da60`. `npm run charsnap:publish -- 0.11.0` refreshes it in place.
- **Open question for Jason:** copy/move-to-lorebook under host mode. The protocol
  only knows one book, so "Open that lorebook" can retarget his save. See
  `docs/plan.md` → *CharSnap host mode, and the one thing it cannot express*.

## What the script runs, by hand

For reading, or if the script itself breaks. Use it in preference to these.

```bash
# sync
SRC=/home/user/charsnap-upstream-src
GIT_LFS_SKIP_SMUDGE=1 git clone -q --depth 5 https://github.com/JasonYCao/charsnap-extensions $SRC
BASE=$(git log --format='%h %s' | grep -m1 -E ' (Sync|Import CharSnap host mode from) charsnap-extensions@' | cut -d' ' -f1)
git checkout -B charsnap-upstream $BASE
git ls-files -z | grep -zvE '^(\.github/|CLAUDE\.md$|docs/|announcements/|mockup\.html$|scripts/)' | xargs -0 git rm -q
git -C $SRC archive HEAD mkp-lorebook-builder | tar -x --strip-components=1
git add -A && git commit -m "Sync charsnap-extensions@$(git -C $SRC rev-parse --short HEAD)"
git checkout <working-branch> && git merge charsnap-upstream

# publish
FORK=/home/user/charsnap-fork
git clone -q https://github.com/MrKingPingus/charsnap-extensions $FORK
git -C $FORK remote add upstream https://github.com/JasonYCao/charsnap-extensions
git -C $FORK fetch -q upstream main
git -C $FORK checkout -B update-builder-vX.Y.Z upstream/main
rm -rf $FORK/mkp-lorebook-builder && mkdir $FORK/mkp-lorebook-builder
git archive HEAD | tar -x -C $FORK/mkp-lorebook-builder --exclude=.github --exclude=CLAUDE.md \
  --exclude=docs --exclude=announcements --exclude=mockup.html --exclude=scripts
cp docs/charsnap-deployment.md $FORK/mkp-lorebook-builder/README.md
git -C $FORK add -A && git -C $FORK diff --cached --stat -- '*host*' '*HOST*'   # expect empty
git -C $FORK commit -m "Update MKP Lorebook Builder to vX.Y.Z"
git -C $FORK push origin update-builder-vX.Y.Z      # --force if it already exists
```
