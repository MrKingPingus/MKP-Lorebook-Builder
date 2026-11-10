// Pure-logic checks for services/txt-import.js. Started with the CharSnap
// page-copy format (#121): a real paste in that shape came out as one
// 10,000-character entry.
import { parseTxtToEntries } from '../src/services/txt-import.js';

// The shape of text copied off a CharSnap lorebook page. Note the traps it
// carries on purpose: a "Type:" line inside a description, a trigger list that
// runs straight into the next entry's name with no blank line, and a trigger
// ("Night Market") that is also the next entry's name.
const PAGE = `Lantern Road
Location
Public
Type: Trade route

Lantern Road runs from the harbour to the hill towns.

Hazards: fog after dusk.

Triggers:
road
lantern
Night Market
Night Market
PlotEvent
Private
Opens on the first new moon of each season.

Triggers:
market
Trigger Condition:
When {{user}} visits the harbour at night.

Old Ferryman
Character
Public
He remembers every passenger.

Triggers:
ferryman
`;

export function runTxtImportChecks() {
  const results = [];
  const check = (label, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    results.push(ok);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expect ${JSON.stringify(want)})`);
  };

  console.log('\n▶ txt import (pure logic)');

  const page = parseTxtToEntries(PAGE);
  check('a CharSnap page copy splits into its entries', page.map((e) => e.name), ['Lantern Road', 'Night Market', 'Old Ferryman']);
  check('the bare type line sets the type', page.map((e) => e.type), ['location', 'plot_event', 'character']);
  check('the Public / Private line sets visibility, and stays out of the text', page.map((e) => e.isPublic), [true, false, true]);
  check('one trigger per line', page[0].triggers, ['road', 'lantern', 'Night Market']);
  check('the last trigger is not swallowed by the next entry, nor the name by the list', page[1].triggers, ['market']);
  check('a "Type:" line inside a description stays description',
    page[0].description, 'Type: Trade route\n\nLantern Road runs from the harbour to the hill towns.\n\nHazards: fog after dusk.');
  check('Trigger Condition goes to its own field', page[1].triggerCondition, 'When {{user}} visits the harbour at night.');
  check('and is empty where there is none', page[0].triggerCondition, '');
  check('the description stops at Triggers:', page[2].description, 'He remembers every passenger.');

  // The formats that were already there must not be caught by the new one.
  const labelled = parseTxtToEntries('Entry: Alpha\nType: Character\nTriggers: a, b\nDescription: First.\n\nEntry: Beta\nType: Item\nTriggers: c\nDescription: Second.');
  check('Entry:-labelled text still parses', labelled.map((e) => [e.name, e.type, e.triggers.length]), [['Alpha', 'character', 2], ['Beta', 'item', 1]]);
  const freeform = parseTxtToEntries('Alpha\nFirst paragraph.\n\nBeta\nSecond paragraph.');
  check('freeform paragraphs still split on blank lines', freeform.map((e) => e.name), ['Alpha', 'Beta']);
  const typeWord = parseTxtToEntries('Alpha\nCharacter\nA line that is not a visibility word.\n\nBeta\nMore text.');
  check('a type word alone, without Public/Private under it, is not a page header', typeWord.length, 2);

  const passed = results.filter(Boolean).length;
  console.log(`  ${passed}/${results.length} txt-import checks passed`);
  return results.every(Boolean);
}
