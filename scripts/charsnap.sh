#!/usr/bin/env bash
# The CharSnap workflow as commands, so no session has to retype it from a doc.
#
#   npm run charsnap:status            where things stand — run this FIRST, every session
#   npm run charsnap:sync              bring Jason's latest changes into the current branch
#   npm run charsnap:publish -- X.Y.Z  put this build on the fork, ready for a PR to Jason
#
# Each command checks its own preconditions and refuses, with the reason, when
# one fails. The why behind every step is in docs/charsnap-workflow.md.
set -euo pipefail

OUR_REPO="MrKingPingus/MKP-Lorebook-Builder"
JASON_URL="https://github.com/JasonYCao/charsnap-extensions"
FORK_URL="https://github.com/MrKingPingus/charsnap-extensions"
SUBDIR="mkp-lorebook-builder"          # where the builder lives in Jason's repo
SRC="${CHARSNAP_SRC:-/home/user/charsnap-upstream-src}"
FORK="${CHARSNAP_FORK:-/home/user/charsnap-fork}"
TRACK="charsnap-upstream"              # local tracking branch, rebuilt on every sync

# Paths that are ours alone: never deleted by a sync, never copied by a publish.
KEEP_RE='^(\.github/|CLAUDE\.md$|docs/|announcements/|mockup\.html$|scripts/)'
PUBLISH_EXCLUDES=(--exclude=.github --exclude=CLAUDE.md --exclude=docs
                  --exclude=announcements --exclude=mockup.html --exclude=scripts)

# A sync commit's subject names the commit of Jason's it took:
#   "Sync charsnap-extensions@<sha>"  (the first import used a longer wording)
SYNC_RE=' (Sync|Import CharSnap host mode from) charsnap-extensions@'

say()  { printf '%s\n' "$*"; }
ok()   { printf '  ✓ %s\n' "$*"; }
warn() { printf '  ⚠ %s\n' "$*"; }
stop() { printf '\n✗ STOP: %s\n' "$*" >&2; exit 1; }

cd "$(git rev-parse --show-toplevel)"

require_our_repo() {
  local url; url=$(git remote get-url origin 2>/dev/null || true)
  case "$url" in
    *"$OUR_REPO"*) ;;
    *) stop "this checkout's origin is '$url', not $OUR_REPO.
  Builder work happens in $OUR_REPO — never in charsnap-extensions, whose
  $SUBDIR/ folder is overwritten on every publish. Start the session on
  $OUR_REPO instead." ;;
  esac
}

require_clean() {
  [ -z "$(git status --porcelain)" ] || stop "there are uncommitted changes. Commit or stash them first."
}

current_branch() {
  local b; b=$(git symbolic-ref --short -q HEAD || true)
  [ -n "$b" ] || stop "HEAD is detached. Check out a branch first."
  [ "$b" != "$TRACK" ] || stop "you are on '$TRACK', the tracking branch. Check out your working branch."
  printf '%s' "$b"
}

jason_head() {
  git ls-remote "$JASON_URL" refs/heads/main | cut -f1
}

# "<our commit> <Jason's sha>" for the newest sync reachable from HEAD.
last_sync() {
  local line; line=$(git log --format='%h %s' | grep -m1 -E "$SYNC_RE" || true)
  [ -n "$line" ] || stop "no sync commit in this branch's history. This branch does not contain
  Jason's code at all — it was probably cut from something other than this repo's main."
  printf '%s %s' "${line%% *}" "${line##*@}"
}

in_sync() { # $1 = Jason's full sha, $2 = the sha named by our last sync
  case "$1" in "$2"*) return 0 ;; *) return 1 ;; esac
}

# ── status ──────────────────────────────────────────────────────────────────
cmd_status() {
  require_our_repo
  local branch jason last sync_commit sync_sha version
  branch=$(git symbolic-ref --short -q HEAD || echo "(detached)")
  version=$(node -p "require('./package.json').version")
  say "Repo:    $OUR_REPO   branch: $branch   version: $version"
  say ""
  say "Jason's code"
  jason=$(jason_head) || stop "could not reach $JASON_URL."
  read -r sync_commit sync_sha <<<"$(last_sync)"
  if in_sync "$jason" "$sync_sha"; then
    ok "in sync: Jason's main is ${jason:0:7}, and this branch merged it (sync commit $sync_commit)"
  else
    warn "BEHIND: Jason's main is ${jason:0:7}; this branch last synced ${sync_sha}."
    warn "Run: npm run charsnap:sync   — before any other work, and before any publish."
  fi

  say ""
  say "Our branches"
  git fetch -q origin 2>/dev/null || warn "could not fetch origin; branch info may be stale"
  local unmerged=0 ref n
  while read -r ref; do
    [ "$ref" = "origin/main" ] || [ "$ref" = "origin/HEAD" ] && continue
    n=$(git rev-list --count "origin/main..$ref" 2>/dev/null || echo 0)
    if [ "$n" -gt 0 ]; then
      warn "${ref#origin/} has $n commit(s) not on main"
      unmerged=1
    fi
  done < <(git for-each-ref --format='%(refname:short)' refs/remotes/origin)
  [ "$unmerged" -eq 1 ] || ok "every branch is merged into main"
  if [ "$branch" = "main" ] && [ "$unmerged" -eq 1 ]; then
    warn "You are on main, but the work listed above is not. If you meant to continue"
    warn "it, check that branch out instead of starting fresh on main."
  fi

  say ""
  say "The fork ($FORK_URL)"
  local pubs; pubs=$(git ls-remote "$FORK_URL" 'refs/heads/update-builder-*' 2>/dev/null | sed 's#.*refs/heads/##' || true)
  if [ -n "$pubs" ]; then
    while read -r ref; do say "  · publish branch: $ref"; done <<<"$pubs"
  else
    say "  · no publish branches"
  fi
}

# ── sync ────────────────────────────────────────────────────────────────────
cmd_sync() {
  require_our_repo
  require_clean
  local branch jason sync_commit sync_sha theirs
  branch=$(current_branch)
  jason=$(jason_head) || stop "could not reach $JASON_URL."
  read -r sync_commit sync_sha <<<"$(last_sync)"
  if in_sync "$jason" "$sync_sha"; then
    ok "already in sync with Jason's main (${jason:0:7}). Nothing to do."
    return 0
  fi

  say "Syncing Jason's ${jason:0:7} into '$branch' (last sync: $sync_sha, our commit $sync_commit)"
  rm -rf "$SRC"
  GIT_LFS_SKIP_SMUDGE=1 git clone -q --depth 5 "$JASON_URL" "$SRC"
  theirs=$(git -C "$SRC" rev-parse HEAD)
  [ "$theirs" = "$jason" ] || stop "the clone is at ${theirs:0:7} but main moved to ${jason:0:7} mid-sync. Run it again."
  [ -d "$SRC/$SUBDIR" ] || stop "Jason's repo has no $SUBDIR/ folder any more. Ask before going further."

  # The tracking branch starts at the previous sync, so the merge below is
  # three-way against it and sees only what Jason changed since.
  git checkout -q -B "$TRACK" "$sync_commit"
  git ls-files -z | grep -zvE "$KEEP_RE" | xargs -0 -r git rm -q
  git -C "$SRC" archive HEAD "$SUBDIR" | tar -x --strip-components=1
  git add -A
  if git diff --cached --quiet; then
    git checkout -q "$branch"
    ok "Jason's new commits do not touch $SUBDIR/. Nothing to merge."
    return 0
  fi
  git commit -q -m "Sync charsnap-extensions@${jason:0:7}"
  git checkout -q "$branch"
  say "  changed by Jason since the last sync:"
  git diff --stat "$sync_commit" "$TRACK" | sed 's/^/    /'

  if git merge --no-edit -m "Merge charsnap-extensions@${jason:0:7}" "$TRACK"; then
    ok "merged cleanly."
  else
    say ""
    say "Conflicts — the usual ones and how to settle them are in docs/charsnap-workflow.md."
    say "Resolve them, then: npm run build && npm run verify, then git commit."
    exit 1
  fi
  say "Next: npm run build && npm run verify. Push only once both pass."
}

# ── publish ─────────────────────────────────────────────────────────────────
cmd_publish() {
  require_our_repo
  require_clean
  local version="${1:-}" pkg branch jason sync_commit sync_sha pub host_diff
  pkg=$(node -p "require('./package.json').version")
  [ -n "$version" ] || stop "say which version: npm run charsnap:publish -- $pkg"
  [ "$version" = "$pkg" ] || stop "you asked to publish $version, but package.json says $pkg."
  branch=$(current_branch)

  jason=$(jason_head) || stop "could not reach $JASON_URL."
  read -r sync_commit sync_sha <<<"$(last_sync)"
  in_sync "$jason" "$sync_sha" || stop "Jason's main is ${jason:0:7}, but this branch last synced $sync_sha.
  Publishing now would undo his newer work. Run npm run charsnap:sync first."

  git fetch -q origin "$branch" || stop "could not fetch origin/$branch."
  [ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$branch")" ] || stop "HEAD is not what origin/$branch holds.
  Push first, so what goes to Jason is recorded in $OUR_REPO."

  pub="update-builder-v$version"
  say "Publishing $branch @ $(git rev-parse --short HEAD) as $pub, cut from Jason's main ${jason:0:7}"
  rm -rf "$FORK"
  git clone -q "$FORK_URL" "$FORK"
  git -C "$FORK" remote add upstream "$JASON_URL"
  git -C "$FORK" fetch -q upstream main
  git -C "$FORK" checkout -q -B "$pub" upstream/main

  rm -rf "${FORK:?}/$SUBDIR" && mkdir "$FORK/$SUBDIR"
  git archive HEAD | tar -x -C "$FORK/$SUBDIR" "${PUBLISH_EXCLUDES[@]}"
  cp docs/charsnap-deployment.md "$FORK/$SUBDIR/README.md"
  git -C "$FORK" add -A

  # After a sync, his host-mode files and ours are identical unless we changed
  # host mode on purpose. Anything else here means the sync did not take.
  host_diff=$(git -C "$FORK" diff --cached --stat -- '*host*' '*HOST*')
  if [ -n "$host_diff" ] && [ "${CHARSNAP_ALLOW_HOST_CHANGES:-}" != "1" ]; then
    say "$host_diff"
    stop "this publish changes Jason's host-mode files (above). If that is intended,
  rerun with CHARSNAP_ALLOW_HOST_CHANGES=1 and say so in the PR."
  fi
  if git -C "$FORK" diff --cached --quiet; then
    ok "Jason's main already matches this build. Nothing to publish."
    return 0
  fi
  git -C "$FORK" commit -q -m "Update MKP Lorebook Builder to v$version"
  say "  files changed in $SUBDIR/:"
  git -C "$FORK" diff --stat HEAD~1 HEAD | tail -1 | sed 's/^/    /'

  # The publish branch is generated, never edited by hand, so replacing an
  # older one (an open PR's head included) is the intended way to refresh it.
  if git -C "$FORK" ls-remote --exit-code origin "refs/heads/$pub" >/dev/null 2>&1; then
    say "  $pub already exists on the fork — replacing it (an open PR on it updates in place)"
    git -C "$FORK" push -q --force origin "$pub" || stop "push to the fork failed. Attach MrKingPingus/charsnap-extensions to the session with push access."
  else
    git -C "$FORK" push -q -u origin "$pub" || stop "push to the fork failed. Attach MrKingPingus/charsnap-extensions to the session with push access."
  fi
  ok "pushed to the fork."
  say ""
  say "Open (or check) the PR to Jason here — a session cannot open it itself:"
  say "  $JASON_URL/compare/main...MrKingPingus:$pub?expand=1"
}

case "${1:-status}" in
  status)  cmd_status ;;
  sync)    cmd_sync ;;
  publish) shift; cmd_publish "${1:-}" ;;
  *) stop "unknown command '$1'. Use status, sync or publish." ;;
esac
