// Pure-logic checks for services/txt-import.js. Started with the CharSnap
// page-copy format (#121): a real paste in that shape came out as one
// 10,000-character entry.
import { parseTxtToEntries } from '../src/services/txt-import.js';
import { odtParagraphs } from '../src/services/odt-import.js';

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

// The same page by way of a Word document: no Public/Private line under the
// type, and a blank line between every line. Its traps: a trigger that is
// itself a type word ("Item") right above the next entry's name, a condition
// whose text runs into the next name, and a description that opens with a
// short line.
const PAGE_NO_VISIBILITY = [
  'Lantern Road', 'Location', 'Type: Trade route',
  'Lantern Road runs from the harbour to the hill towns, lit every forty paces by a lamp the ferry guild keeps burning.',
  'Triggers:', 'road', 'lantern', 'Item',
  'Brass Token', 'Item', 'A fare token.',
  'Worth one crossing. The guild stamps each with the year it was struck, and old ones are refused at the gate.',
  'Triggers:', 'token', 'fare',
  'Trigger Condition:', 'When {{user}} pays for a crossing.',
  'Old Ferryman', 'Character',
  'He remembers every passenger he has carried and what each of them owed him at the end of the crossing.',
  'Triggers:', 'ferryman',
].join('\n\n');

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

  const bare = parseTxtToEntries(PAGE_NO_VISIBILITY);
  check('a page copy without Public/Private lines still splits', bare.map((e) => e.name), ['Lantern Road', 'Brass Token', 'Old Ferryman']);
  check('with the right types', bare.map((e) => e.type), ['location', 'item', 'character']);
  check('a trigger that is a type word stays a trigger, and does not make the one above it a name',
    bare[0].triggers, ['road', 'lantern', 'Item']);
  check('a short first line is still description', bare[1].description.startsWith('A fare token.\n\nWorth one crossing.'), true);
  check('blank lines between every line do not become triggers', bare[1].triggers, ['token', 'fare']);
  check('a condition ends where the next entry begins', bare[1].triggerCondition, 'When {{user}} pays for a crossing.');
  check('the last entry is complete', [bare[2].triggers, bare[2].description.length > 50], [['ferryman'], true]);
  check('with no visibility line, entries arrive private, as new entries do', bare.map((e) => e.isPublic), [false, false, false]);

  // The formats that were already there must not be caught by the new one.
  const labelled = parseTxtToEntries('Entry: Alpha\nType: Character\nTriggers: a, b\nDescription: First.\n\nEntry: Beta\nType: Item\nTriggers: c\nDescription: Second.');
  check('Entry:-labelled text still parses', labelled.map((e) => [e.name, e.type, e.triggers.length]), [['Alpha', 'character', 2], ['Beta', 'item', 1]]);
  const freeform = parseTxtToEntries('Alpha\nFirst paragraph.\n\nBeta\nSecond paragraph.');
  check('freeform paragraphs still split on blank lines', freeform.map((e) => e.name), ['Alpha', 'Beta']);
  const typeWord = parseTxtToEntries('Alpha\nCharacter\nA line that is not a visibility word.\n\nBeta\nMore text.');
  check('a type word alone, without Public/Private under it, is not a page header', typeWord.length, 2);

  // ── OpenDocument text (.odt) ──────────────────────────────────────────────
  const xml = '<office:document-content><office:body><office:text>'
    + '<text:h text:outline-level="1">Lantern Road</text:h>'
    + '<text:p>Location</text:p>'
    + '<text:p text:style-name="P1">Runs&#160;from the <text:span>harbour</text:span> &amp; the hills.<text:s text:c="2"/>Lit<text:line-break/>nightly.</text:p>'
    + '<text:p/>'
    + '<text:list><text:list-item><text:p>Triggers:</text:p></text:list-item></text:list>'
    + '</office:text></office:body></office:document-content>';
  check('.odt: headings and paragraphs come out in order, one per item',
    odtParagraphs(xml), ['Lantern Road', 'Location', 'Runs\u00a0from the harbour & the hills.  Lit\nnightly.', '', 'Triggers:']);

  const passed = results.filter(Boolean).length;
  console.log(`  ${passed}/${results.length} txt-import checks passed`);
  return results.every(Boolean);
}
