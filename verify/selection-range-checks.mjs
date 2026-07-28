// Pure-logic checks for services/selection-range.js — the modifier+click
// gesture table. Every branch is reachable without a browser, so the whole
// table gets exercised here and the browser scenarios only have to prove the
// wiring reaches it.
import { rangeBetween, resolveSelectionClick } from '../src/services/selection-range.js';
import { SELECTION_ACTIONS } from '../src/constants/selection.js';

const ORDER = ['a', 'b', 'c', 'd', 'e'];

export function runSelectionRangeChecks() {
  const results = [];
  const check = (label, got, want) => {
    const ok = got === want;
    results.push(ok);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expect ${JSON.stringify(want)})`);
  };

  console.log('\n▶ selection-range (pure logic)');

  // ── rangeBetween ───────────────────────────────────────────────────────────
  const r = (anchor, target, order = ORDER) => rangeBetween(order, anchor, target).join('');

  check('a range downward is inclusive at both ends', r('b', 'd'), 'bcd');
  check('a range upward is the same span', r('d', 'b'), 'bcd');
  check('anchor equal to target is a single entry', r('c', 'c'), 'c');
  check('the whole list is reachable', r('a', 'e'), 'abcde');
  // An anchor that has been filtered away, deleted, or belongs to the other
  // crosstalk pane must not throw the selection somewhere arbitrary.
  check('a missing anchor degrades to the target alone', r('gone', 'c'), 'c');
  check('a null anchor degrades to the target alone', r(null, 'c'), 'c');
  check('a target not on screen selects nothing', r('a', 'gone'), '');
  check('an empty order selects nothing', r('a', 'b', []), '');

  // ── the gesture table ──────────────────────────────────────────────────────
  const click = (mods, { anchorId = 'b', targetId = 'd', isSelectMode = true } = {}) =>
    resolveSelectionClick({ ...mods, orderedIds: ORDER, anchorId, targetId, isSelectMode });

  const plain    = click({});
  const shift    = click({ shiftKey: true });
  const ctrl     = click({ ctrlKey: true });
  const ctrlShft = click({ ctrlKey: true, shiftKey: true });
  const cmd      = click({ metaKey: true });

  check('a plain click is not a macro', plain.action, SELECTION_ACTIONS.NONE);
  check('shift adds', shift.action, SELECTION_ACTIONS.ADD);
  check('shift adds the whole range', shift.ids.join(''), 'bcd');
  check('ctrl removes', ctrl.action, SELECTION_ACTIONS.REMOVE);
  check('ctrl removes one entry only', ctrl.ids.join(''), 'd');
  check('ctrl+shift removes', ctrlShft.action, SELECTION_ACTIONS.REMOVE);
  check('ctrl+shift removes the whole range', ctrlShft.ids.join(''), 'bcd');
  // Cmd stands in for Ctrl: a real ctrl+click on macOS opens the context menu.
  check('cmd behaves as ctrl', cmd.action, SELECTION_ACTIONS.REMOVE);
  check('cmd removes one entry only', cmd.ids.join(''), 'd');

  // Every macro re-anchors, so a run of shift+clicks walks outward from the
  // last thing acted on rather than from some long-forgotten first click.
  check('shift re-anchors on the target', shift.anchorId, 'd');
  check('ctrl re-anchors on the target', ctrl.anchorId, 'd');
  check('a plain click leaves the anchor alone', plain.anchorId, 'b');

  // ── entering select mode ───────────────────────────────────────────────────
  const outside = (mods) => click(mods, { isSelectMode: false });

  check('shift+click outside select mode still adds', outside({ shiftKey: true }).action, SELECTION_ACTIONS.ADD);
  // With nothing selected there is nothing to remove, so ctrl+click outside
  // select mode must not drag the user into it for a no-op.
  check('ctrl+click outside select mode does nothing',
    outside({ ctrlKey: true }).action, SELECTION_ACTIONS.NONE);
  check('ctrl+shift outside select mode does nothing',
    outside({ ctrlKey: true, shiftKey: true }).action, SELECTION_ACTIONS.NONE);

  // ── first shift+click of a fresh selection ─────────────────────────────────
  const first = resolveSelectionClick({
    shiftKey: true, orderedIds: ORDER, anchorId: null, targetId: 'c', isSelectMode: false,
  });
  check('the first shift+click selects just that entry', first.ids.join(''), 'c');
  check('and sets the anchor for the next one', first.anchorId, 'c');

  // ── degenerate input ───────────────────────────────────────────────────────
  check('no target is not a macro', resolveSelectionClick({ shiftKey: true }).action, SELECTION_ACTIONS.NONE);
  check('no arguments at all is not a macro', resolveSelectionClick().action, SELECTION_ACTIONS.NONE);
  check('a shift+click on an off-screen target does nothing',
    click({ shiftKey: true }, { targetId: 'gone' }).action, SELECTION_ACTIONS.NONE);

  const passed = results.filter(Boolean).length;
  console.log(`  ${passed}/${results.length} selection-range checks passed`);
  return results.every(Boolean);
}
