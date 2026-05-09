// Structural delta between two entry objects. Pure — no React, no stores.
//
// Description uses a hand-rolled word-level LCS so inline changes surface as
// add/del segments instead of a wholesale replace. Triggers use ordered set
// arithmetic. Other fields are equality checks. The shape is uniform: any
// changed field gets a non-null entry; unchanged fields are null so consumers
// can render conditionally without prop drilling booleans.
//
// `entriesShallowEqual` is a cheap path that skips the LCS — used by the
// cross-pane badge tint to decide green-vs-yellow on every render without
// burning cycles diffing the description for every matched entry.

// Tokenize on whitespace boundaries while preserving the whitespace runs as
// their own tokens, so the diff segments can be concatenated back into a
// faithful reconstruction of the input. Word characters (incl. straight and
// curly apostrophes so contractions like "Akaya's" stay one token) are split
// from punctuation runs — otherwise trailing punctuation drift makes the
// shared word fail to match (e.g. "laundromat," vs "laundromat." would both
// appear as wholesale changes instead of a shared "laundromat").
function tokenize(text) {
  return text.match(/\s+|[\w'’]+|[^\s\w'’]+/g) ?? [];
}

// Cap to avoid quadratic blow-up on pathological inputs (e.g. multi-thousand
// word descriptions). Above the cap we degrade to a wholesale del+add — the
// consumer still gets a usable "this changed entirely" view.
const DIFF_TOKEN_CAP = 4000;

function diffTokens(a, b) {
  if (a.length === 0 && b.length === 0) return [];
  if (a.length + b.length > DIFF_TOKEN_CAP) {
    const out = [];
    if (a.length) out.push({ kind: 'del', text: a.join('') });
    if (b.length) out.push({ kind: 'add', text: b.join('') });
    return out;
  }

  // Standard LCS DP. dp[i][j] = LCS length of a[i..], b[j..].
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const raw = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      raw.push({ kind: 'same', text: a[i] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      raw.push({ kind: 'del', text: a[i] });
      i++;
    } else {
      raw.push({ kind: 'add', text: b[j] });
      j++;
    }
  }
  while (i < n) raw.push({ kind: 'del', text: a[i++] });
  while (j < m) raw.push({ kind: 'add', text: b[j++] });

  // Coalesce consecutive segments of the same kind so render emits one span
  // per visible chunk rather than one per token.
  const out = [];
  for (const seg of raw) {
    const last = out[out.length - 1];
    if (last && last.kind === seg.kind) last.text += seg.text;
    else out.push({ kind: seg.kind, text: seg.text });
  }
  return out;
}

export function diffEntries(before, after) {
  const a = before ?? {};
  const b = after  ?? {};

  const delta = {
    changedFields:    new Set(),
    name:             null,
    type:             null,
    description:      null,
    triggers:         null,
    hiddenFromExport: null,
  };

  const aName = a.name ?? '';
  const bName = b.name ?? '';
  if (aName !== bName) {
    delta.changedFields.add('name');
    delta.name = { before: aName, after: bName };
  }

  const aType = a.type ?? '';
  const bType = b.type ?? '';
  if (aType !== bType) {
    delta.changedFields.add('type');
    delta.type = { before: aType, after: bType };
  }

  const aDesc = a.description ?? '';
  const bDesc = b.description ?? '';
  if (aDesc !== bDesc) {
    delta.changedFields.add('description');
    delta.description = {
      before:   aDesc,
      after:    bDesc,
      segments: diffTokens(tokenize(aDesc), tokenize(bDesc)),
    };
  }

  const aTrig = a.triggers ?? [];
  const bTrig = b.triggers ?? [];
  const aSet  = new Set(aTrig);
  const bSet  = new Set(bTrig);
  const added   = bTrig.filter((t) => !aSet.has(t));
  const removed = aTrig.filter((t) => !bSet.has(t));
  const common  = bTrig.filter((t) => aSet.has(t));
  if (added.length || removed.length) delta.changedFields.add('triggers');
  delta.triggers = { added, removed, common };

  const aHidden = !!a.hiddenFromExport;
  const bHidden = !!b.hiddenFromExport;
  if (aHidden !== bHidden) {
    delta.changedFields.add('hiddenFromExport');
    delta.hiddenFromExport = { before: aHidden, after: bHidden };
  }

  return delta;
}

// Cheap "do these differ at all?" check. Skips description tokenization and
// LCS — just equality on each field. Safe to call on every render of every
// matched entry pair.
export function entriesShallowEqual(a, b) {
  if (!a || !b) return a === b;
  if ((a.name ?? '')        !== (b.name ?? ''))        return false;
  if ((a.type ?? '')        !== (b.type ?? ''))        return false;
  if ((a.description ?? '') !== (b.description ?? '')) return false;
  if (!!a.hiddenFromExport  !== !!b.hiddenFromExport)  return false;
  const at = a.triggers ?? [];
  const bt = b.triggers ?? [];
  if (at.length !== bt.length) return false;
  const bset = new Set(bt);
  for (const t of at) if (!bset.has(t)) return false;
  return true;
}
