// Splits the bundled CHANGELOG into individual releases.
//
// The changelog is already the single source of truth for what shipped — it is
// written in plain language for exactly this reason (see CLAUDE.md). Rather than
// maintaining a second hand-curated list that can drift, the update notice reads
// the same file the lander does and shows only the newest section.
//
// Working on the parsed AST rather than the raw string matters: an `h2` block is
// unambiguously a release heading, whereas a regex over markdown would also match
// a line beginning with "## " inside a fenced block or a quoted example.
import { parseMarkdown } from './markdown-parse.js';

// The dated `## 2026-07-29` headings are the release boundaries. `# Changelog`
// is an h1 and the Additions / Fixes / Adjustments groupings are h3, so neither
// can be mistaken for one.
function headingText(block) {
  return (block.inline ?? [])
    .map((s) => s.text ?? '')
    .join('')
    .trim();
}

/**
 * Every release in the changelog, newest first.
 * Each is `{ id, blocks }` — `id` is the heading text (the date), `blocks` are
 * the AST blocks under it, excluding the heading and any trailing rule.
 */
export function parseReleases(changelogRaw) {
  const blocks = parseMarkdown(changelogRaw ?? '');
  const releases = [];
  let current = null;

  for (const block of blocks) {
    if (block.type === 'h2') {
      current = { id: headingText(block), blocks: [] };
      releases.push(current);
      continue;
    }
    if (!current) continue;          // preamble above the first release
    if (block.type === 'hr') continue; // the rule between releases is a separator, not content
    current.blocks.push(block);
  }

  return releases.filter((r) => r.id && r.blocks.length > 0);
}

/** The newest release, or null when the changelog has none. */
export function latestRelease(changelogRaw) {
  return parseReleases(changelogRaw)[0] ?? null;
}

/**
 * Whether the update notice should open.
 *
 * `lastSeen` is null for someone who has never been told about a release. That
 * covers two different people, and telling them apart is the whole point:
 *   - a returning user from before this feature existed — show them the notice
 *   - a brand-new user on their first ever visit — show nothing. They have no
 *     "before" to be updated from, and opening on a changelog is a poor first
 *     impression of an app they have not used yet.
 * `hasExistingWork` is what distinguishes them.
 */
export function shouldShowUpdateNotice({ latestId, lastSeen, hasExistingWork }) {
  if (!latestId) return false;
  if (lastSeen === latestId) return false;
  if (lastSeen === null) return Boolean(hasExistingWork);
  return true;
}
