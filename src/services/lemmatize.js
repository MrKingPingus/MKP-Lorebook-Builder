// Rule-based English lemmatizer — given an inflected word, return base-form
// candidates in best-guess priority order. Used as a fallback in
// thesaurus-service.js when the original word returns no synonyms (e.g.,
// "features" → "feature", "lives" → "life", "majoring" → "major").
//
// Candidates are tried sequentially against the dictionary API; the first
// hit wins. Bad guesses just 404 quietly. Order matters for performance,
// not correctness.

// Common English irregulars where a rule can't reach. Kept short on purpose
// — only the highest-frequency forms.
const IRREGULAR = {
  // verbs
  went: 'go', gone: 'go',
  took: 'take', taken: 'take',
  did: 'do', done: 'do',
  had: 'have',
  said: 'say',
  saw: 'see', seen: 'see',
  came: 'come',
  gave: 'give', given: 'give',
  got: 'get', gotten: 'get',
  made: 'make',
  knew: 'know', known: 'know',
  thought: 'think',
  brought: 'bring',
  bought: 'buy',
  found: 'find',
  fought: 'fight',
  caught: 'catch',
  taught: 'teach',
  built: 'build',
  felt: 'feel',
  held: 'hold',
  kept: 'keep',
  left: 'leave',
  lost: 'lose',
  meant: 'mean',
  met: 'meet',
  paid: 'pay',
  ran: 'run',
  sat: 'sit',
  sent: 'send',
  shot: 'shoot',
  slept: 'sleep',
  spoke: 'speak', spoken: 'speak',
  spent: 'spend',
  stood: 'stand',
  swam: 'swim', swum: 'swim',
  told: 'tell',
  understood: 'understand',
  wore: 'wear', worn: 'wear',
  won: 'win',
  wrote: 'write', written: 'write',
  // irregular plurals
  men: 'man',
  women: 'woman',
  children: 'child',
  mice: 'mouse',
  feet: 'foot',
  teeth: 'tooth',
  geese: 'goose',
  oxen: 'ox',
  people: 'person',
};

/**
 * Return base-form candidates for an inflected word, ordered by likelihood.
 * The original word is excluded from the result (caller already tried it).
 * Empty array means no rules applied.
 */
export function lemmaCandidates(word) {
  const w = (word || '').toLowerCase().trim();
  if (!w || w.length < 3) return [];

  const candidates = new Set();

  // Irregular table is a hard override — try it first
  if (IRREGULAR[w]) candidates.add(IRREGULAR[w]);

  // -ies → -y (cities → city, families → family)
  if (w.endsWith('ies') && w.length > 4) {
    candidates.add(w.slice(0, -3) + 'y');
  }

  // -ves → -fe / -f (lives → life, knives → knife, leaves → leaf)
  if (w.endsWith('ves') && w.length > 4) {
    candidates.add(w.slice(0, -3) + 'fe');
    candidates.add(w.slice(0, -3) + 'f');
  }

  // -es → -e or '' (features → feature, boxes → box, churches → church)
  if (w.endsWith('es') && w.length > 3) {
    candidates.add(w.slice(0, -1)); // features → feature
    candidates.add(w.slice(0, -2)); // boxes → box
  }

  // -s plural (cats → cat). Skip "ss" (pass), "us" (focus), "is" (basis).
  if (
    w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') &&
    !w.endsWith('is') && w.length > 3
  ) {
    candidates.add(w.slice(0, -1));
  }

  // -ing: bare stem, +e form, doubled-consonant stripped
  // (working → work, making → make, running → run)
  if (w.endsWith('ing') && w.length > 5) {
    const stem = w.slice(0, -3);
    candidates.add(stem);
    candidates.add(stem + 'e');
    if (stem.length > 1 && stem[stem.length - 1] === stem[stem.length - 2]) {
      candidates.add(stem.slice(0, -1));
    }
  }

  // -ied → -y (tried → try, studied → study)
  if (w.endsWith('ied') && w.length > 4) {
    candidates.add(w.slice(0, -3) + 'y');
  }

  // -ed: bare stem, +e form, doubled-consonant stripped
  // (worked → work, baked → bake, stopped → stop)
  if (w.endsWith('ed') && w.length > 4) {
    const stem = w.slice(0, -2);
    candidates.add(stem);
    candidates.add(stem + 'e');
    if (stem.length > 1 && stem[stem.length - 1] === stem[stem.length - 2]) {
      candidates.add(stem.slice(0, -1));
    }
  }

  // -er / -est comparative & superlative (faster → fast, cuter → cute)
  if (w.endsWith('er') && w.length > 4) {
    candidates.add(w.slice(0, -2));
    candidates.add(w.slice(0, -1));
  }
  if (w.endsWith('est') && w.length > 5) {
    candidates.add(w.slice(0, -3));
    candidates.add(w.slice(0, -2));
  }

  // -ly adverb (quickly → quick)
  if (w.endsWith('ly') && w.length > 4) {
    candidates.add(w.slice(0, -2));
  }

  candidates.delete(w);
  return [...candidates].filter((c) => c.length >= 2);
}
