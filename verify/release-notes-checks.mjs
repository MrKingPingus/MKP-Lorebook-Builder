// Pure-logic checks for the update notice's "should this open?" rule and the
// changelog splitter behind it.
//
// This is worth testing without a browser because the interesting cases are all
// about *who* the user is, and reproducing "returning user who predates the
// feature" in Playwright means fabricating storage state — which tests the
// fabrication as much as the rule.
import { parseReleases, latestRelease, userFacingBlocks, shouldShowUpdateNotice } from '../src/services/release-notes.js';

const SAMPLE = `# Changelog

---

## 2026-07-29

### New

- **Newest thing.** Description.

### Under the hood

- Internal note nobody outside the repo cares about.

---

## 2026-07-28

### Fixes

- **Older thing.** Description.

---
`;

export function runReleaseNotesChecks() {
  const results = [];
  const check = (label, got, want) => {
    const ok = got === want;
    results.push(ok);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expect ${JSON.stringify(want)})`);
  };

  console.log('\n▶ release notes (pure logic)');

  // ── splitting the changelog ──────────────────────────────────────────────
  const releases = parseReleases(SAMPLE);
  check('every dated section is a release', releases.length, 2);
  check('newest comes first', releases[0].id, '2026-07-29');
  check('and the older one follows', releases[1].id, '2026-07-28');
  check('the h1 title is not mistaken for a release',
    releases.some((r) => r.id.toLowerCase() === 'changelog'), false);
  check('separators are dropped from a release body',
    releases[0].blocks.some((b) => b.type === 'hr'), false);
  check('the heading itself is not repeated in the body',
    releases[0].blocks.some((b) => b.type === 'h2'), false);
  check('subsection headings survive',
    releases[0].blocks.some((b) => b.type === 'h3'), true);
  check('latestRelease agrees with the first entry', latestRelease(SAMPLE).id, '2026-07-29');
  check('an empty changelog yields nothing', latestRelease(''), null);

  // ── what the in-app notice actually shows ────────────────────────────────
  // "Under the hood" stays in the file for contributors but must never reach a
  // user — telling someone the README was reorganised is worse than telling
  // them nothing, because it costs them the attention they gave the notice.
  const user = latestRelease(SAMPLE).userBlocks;
  const headings = user.filter((b) => b.type === 'h3')
    .map((b) => b.inline.map((i) => i.text ?? '').join(''));
  check('user-facing blocks keep New', headings.includes('New'), true);
  check('and drop Under the hood', headings.includes('Under the hood'), false);
  check('the internal bullet goes with its heading',
    JSON.stringify(user).includes('nobody outside the repo'), false);
  check('the user-facing bullet survives',
    JSON.stringify(user).includes('Newest thing'), true);
  check('the full blocks still carry everything',
    JSON.stringify(latestRelease(SAMPLE).blocks).includes('nobody outside the repo'), true);
  check('filtering nothing changes nothing',
    userFacingBlocks([{ type: 'p', inline: [] }]).length, 1);

  // ── who sees it ──────────────────────────────────────────────────────────
  const show = (lastSeen, hasExistingWork, latestId = '2026-07-29') =>
    shouldShowUpdateNotice({ latestId, lastSeen, hasExistingWork });

  // The distinction the whole feature rests on: a null lastSeen is both the
  // returning user who predates this feature AND someone's very first visit.
  check('a returning user who has never seen a notice gets one', show(null, true), true);
  check('a brand-new user does not', show(null, false), false);

  check('someone already shown this release does not see it again', show('2026-07-29', true), false);
  check('…and that holds even with no saved work', show('2026-07-29', false), false);
  check('a newer release re-opens it', show('2026-07-28', true), true);
  // Once someone has been shown anything, they are a known user — a new release
  // should reach them whether or not they currently have books saved (they may
  // have deleted them all).
  check('a newer release reaches a known user with no books', show('2026-07-28', false), true);

  check('no changelog means nothing to show', show(null, true, null), false);

  const passed = results.filter(Boolean).length;
  console.log(`  ${passed}/${results.length} release-notes checks passed`);
  return results.every(Boolean);
}
