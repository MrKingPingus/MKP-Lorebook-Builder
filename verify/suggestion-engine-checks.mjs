// Pure-logic checks for services/suggestion-engine.js. Started with the
// tester's all-caps report: "SHAWTY GOT LOW" was suggested as "S H", "W T"…
import { generateSuggestionPool } from '../src/services/suggestion-engine.js';

export function runSuggestionEngineChecks() {
  const results = [];
  const check = (label, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    results.push(ok);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expect ${JSON.stringify(want)})`);
  };
  const pool = (name, description) => generateSuggestionPool({ name, description });

  console.log('\n▶ suggestion engine (pure logic)');

  const shouted = pool('BOOTS WITH THE FUR', "the whole club was lookin' at her\n\nSHAWTY GOT LOW LOW LOW");
  check('no one- or two-letter fragments from all-caps words',
    shouted.filter((s) => /^[A-Za-z]( [A-Za-z])?$/.test(s)), []);
  check('a shouted line suggests its words as ordinary words', ['shawty', 'low'].every((w) => shouted.includes(w)), true);
  check('the full name is still offered as written', shouted[0], 'BOOTS WITH THE FUR');

  const named = pool('Organization XIII', 'Founded by Xemnas, Organization XIII works from the citadel.');
  check('an all-caps word in ordinary text stays whole, as a name', named.includes('XIII'), true);
  check('and still pairs with the name beside it', named.includes('Organization XIII'), true);

  const plain = pool('Reika', 'Reika Hirahara lives in the old quarter with Akaya.');
  check('ordinary text is unchanged: names keep their capitals', ['Hirahara', 'Akaya', 'Reika Hirahara'].every((w) => plain.includes(w)), true);
  check('and common words come out lowercase', plain.includes('quarter'), true);

  const passed = results.filter(Boolean).length;
  console.log(`  ${passed}/${results.length} suggestion-engine checks passed`);
  return results.every(Boolean);
}
