// Pure-logic checks for services/warning-color.js — the scale that turns a
// counted value into a colour.
//
// The bulk of this file guards ONE promise: turning on a new scale must never
// move an existing user's red. The three-colour rows below are the behaviour
// that shipped before the scale setting existed, asserted against the same
// thresholds a real stored settings blob carries — including the legacy
// two-number `counterTiers` shape, which App.jsx migrates on boot but which the
// service still has to read correctly if it is handed one first.
import {
  warningColor, charStops, triggerStops, titleStops, storageStops, isGradient,
  WARN_GREEN, WARN_YELLOW, WARN_ORANGE, WARN_RED,
} from '../src/services/warning-color.js';
import {
  WARNING_SCALE_THREE, WARNING_SCALE_FOUR, WARNING_SCALE_GRADIENT,
  GRADIENT_GREEN_HOLD,
} from '../src/constants/warning-scale.js';
import {
  CHAR_LIMIT, MAX_TRIGGERS, TRIGGER_WARN_YELLOW, TITLE_CHAR_LIMIT,
} from '../src/constants/limits.js';

// What a user's settings look like after the boot migration, and before it.
const MIGRATED = { yellow: 750, orange: 1000, red: CHAR_LIMIT };
const LEGACY   = { yellow: 750, red: 1000 };

export function runWarningColorChecks() {
  const results = [];
  const check = (label, got, want) => {
    const ok = got === want;
    results.push(ok);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expect ${JSON.stringify(want)})`);
  };

  console.log('\n▶ warning-color (pure logic)');

  const charColor = (v, tiers, mode) =>
    warningColor(v, charStops(tiers, mode), { gradient: isGradient(mode) });

  // ── the no-regression promise: three-colour is exactly what shipped ────────
  for (const [name, tiers] of [['migrated', MIGRATED], ['legacy', LEGACY]]) {
    const c = (v) => charColor(v, tiers, WARNING_SCALE_THREE);
    check(`three-colour (${name}) is green below the first threshold`, c(749), WARN_GREEN);
    check(`three-colour (${name}) turns yellow exactly at it`,         c(750), WARN_YELLOW);
    check(`three-colour (${name}) stays yellow just under danger`,     c(999), WARN_YELLOW);
    check(`three-colour (${name}) turns red exactly at danger`,        c(1000), WARN_RED);
    check(`three-colour (${name}) is still red past the cap`,          c(9999), WARN_RED);
    // The whole point: no orange anywhere on a three-colour scale.
    check(`three-colour (${name}) never paints orange`,
      [0, 750, 1000, 1499, 1500, 3000].some((v) => c(v) === WARN_ORANGE), false);
  }

  // ── four colours: red moves to the cap, orange takes the old danger stop ───
  const f = (v) => charColor(v, MIGRATED, WARNING_SCALE_FOUR);
  check('four-colour keeps green below the first threshold', f(749),  WARN_GREEN);
  check('four-colour keeps yellow where it was',             f(750),  WARN_YELLOW);
  check('four-colour paints the old red band orange',        f(1000), WARN_ORANGE);
  check('four-colour holds orange right up to the cap',      f(1499), WARN_ORANGE);
  check('four-colour turns red at the cap — GitHub #131',    f(1500), WARN_RED);
  check('four-colour stays red beyond the cap',              f(2500), WARN_RED);

  // A legacy blob read before the migration must land on the same bands, or a
  // user switching scales on their first post-upgrade paint sees the wrong one.
  const fl = (v) => charColor(v, LEGACY, WARNING_SCALE_FOUR);
  check('four-colour on a legacy blob still oranges at 1000', fl(1000), WARN_ORANGE);
  check('four-colour on a legacy blob still reds at the cap', fl(CHAR_LIMIT), WARN_RED);

  // ── gradient ──────────────────────────────────────────────────────────────
  // Green holds flat, then eases into yellow over the run-up to the first
  // threshold. The hold point is proportional (GRADIENT_GREEN_HOLD of the
  // threshold), so it tracks whatever numbers the user sets rather than a fixed
  // character count: at the default 750 it holds to 500 and fades over the last
  // 250. Without the ease the ramp had exactly one hard edge on it, at the very
  // threshold the gradient scale exists to soften.
  const g = (v) => charColor(v, MIGRATED, WARNING_SCALE_GRADIENT);
  const hold = 750 * GRADIENT_GREEN_HOLD;
  check('gradient is flat green well below the threshold',  g(100), WARN_GREEN);
  check('gradient is still flat green at the hold point',   g(hold), WARN_GREEN);
  check('gradient has left green a third of the way up',
    g(hold + (750 - hold) / 3), 'color-mix(in oklab, var(--green) 67%, var(--yellow) 33%)');
  check('gradient is half green half yellow mid-run-up',
    g((hold + 750) / 2), 'color-mix(in oklab, var(--green) 50%, var(--yellow) 50%)');
  check('gradient arrives exactly on yellow at the threshold', g(750), WARN_YELLOW);
  // The run-up scales with the threshold rather than being a fixed run of
  // characters — someone warning at 300 should not get the same 250-char fade.
  const tight = { yellow: 300, orange: 600, red: 900 };
  check('a lower threshold shortens the run-up proportionally',
    charColor(200, tight, WARNING_SCALE_GRADIENT), WARN_GREEN);
  check('and reaches yellow on time at that threshold',
    charColor(300, tight, WARNING_SCALE_GRADIENT), WARN_YELLOW);
  check('and is mid-fade halfway through its own run-up',
    charColor((300 * GRADIENT_GREEN_HOLD + 300) / 2, tight, WARNING_SCALE_GRADIENT),
    'color-mix(in oklab, var(--green) 50%, var(--yellow) 50%)');
  // The ease is gradient-only — the stepped scales must stay hard-edged.
  check('the four-colour scale is untouched by the ease',
    charColor(700, MIGRATED, WARNING_SCALE_FOUR), WARN_GREEN);
  check('the three-colour scale is untouched by the ease',
    charColor(700, MIGRATED, WARNING_SCALE_THREE), WARN_GREEN);
  // Storage rests on muted, so its ease has to fade FROM muted, not from green.
  check('storage gradient eases from muted, not from green',
    warningColor(0.5, storageStops(WARNING_SCALE_GRADIENT), { gradient: true, base: 'var(--muted2)' }),
    'color-mix(in oklab, var(--muted2) 50%, var(--yellow) 50%)');
  check('gradient lands exactly on orange at the mid stop', g(1000), WARN_ORANGE);
  check('gradient ends exactly on red at the cap',          g(1500), WARN_RED);
  check('gradient stays red beyond the cap',                g(4000), WARN_RED);
  check('gradient blends toward orange in the lower band',
    g(875), 'color-mix(in oklab, var(--yellow) 50%, var(--orange) 50%)');
  check('gradient blends toward red in the upper band',
    g(1250), 'color-mix(in oklab, var(--orange) 50%, var(--red) 50%)');
  // Blends must name theme tokens, never hexes — a custom or high-contrast
  // palette has to be able to fade through its own colours.
  check('a blend references tokens, not hardcoded colours',
    /#[0-9a-f]{3,8}/i.test(g(1100)), false);

  // ── degenerate thresholds: nothing stops a user typing red below yellow ────
  const inverted = { yellow: 1000, orange: 500, red: 400 };
  check('an inverted set still resolves to a colour, not NaN',
    typeof charColor(1200, inverted, WARNING_SCALE_GRADIENT), 'string');
  check('an inverted set is green below its first stop',
    charColor(10, inverted, WARNING_SCALE_GRADIENT), WARN_GREEN);
  const flat = { yellow: 500, orange: 500, red: 500 };
  check('a zero-width band does not divide by zero',
    charColor(500, flat, WARNING_SCALE_GRADIENT), WARN_RED);

  // ── triggers and titles insert their fourth colour, they do not append ─────
  // Their three-colour red already sat on the hard cap, so moving it would be
  // the regression this whole file exists to prevent.
  const t3 = (v) => warningColor(v, triggerStops(WARNING_SCALE_THREE));
  const t4 = (v) => warningColor(v, triggerStops(WARNING_SCALE_FOUR));
  check('triggers: three-colour reds at the cap', t3(MAX_TRIGGERS), WARN_RED);
  check('triggers: three-colour is yellow just below it', t3(MAX_TRIGGERS - 1), WARN_YELLOW);
  check('triggers: four-colour still reds at the cap, not before', t4(MAX_TRIGGERS), WARN_RED);
  check('triggers: four-colour inserts orange below the cap', t4(24), WARN_ORANGE);
  check('triggers: four-colour keeps yellow at the warn point', t4(TRIGGER_WARN_YELLOW), WARN_YELLOW);
  check('triggers: green below the warn point', t4(TRIGGER_WARN_YELLOW - 1), WARN_GREEN);

  const ti3 = (v) => warningColor(v, titleStops(WARNING_SCALE_THREE));
  const ti4 = (v) => warningColor(v, titleStops(WARNING_SCALE_FOUR));
  check('titles: three-colour reds at the cap', ti3(TITLE_CHAR_LIMIT), WARN_RED);
  check('titles: four-colour still reds at the cap', ti4(TITLE_CHAR_LIMIT), WARN_RED);
  check('titles: four-colour inserts orange below it', ti4(46), WARN_ORANGE);

  // ── storage appends, like characters, and rests on muted rather than green ─
  const MUTED = 'var(--muted2)';
  const s3 = (v) => warningColor(v, storageStops(WARNING_SCALE_THREE), { base: MUTED });
  const s4 = (v) => warningColor(v, storageStops(WARNING_SCALE_FOUR),  { base: MUTED });
  check('storage: an almost-empty ring is muted, not green', s3(0.03), MUTED);
  check('storage: three-colour warns at 60%',  s3(0.60), WARN_YELLOW);
  check('storage: three-colour dangers at 85%', s3(0.85), WARN_RED);
  check('storage: four-colour leaves 85% orange', s4(0.85), WARN_ORANGE);
  check('storage: four-colour reds only when nearly full', s4(0.95), WARN_RED);
  check('storage: a full ring is red on both scales', s3(1) === WARN_RED && s4(1) === WARN_RED, true);

  // ── per-entry limit overrides feed a different cap into the same stops ─────
  check('a raised per-entry limit moves the four-colour red with it',
    warningColor(1500, charStops({ yellow: 750, red: 1000 }, WARNING_SCALE_FOUR, 3000), {}),
    WARN_ORANGE);

  const passed = results.filter(Boolean).length;
  console.log(`  ${passed}/${results.length} warning-color checks passed`);
  return results.every(Boolean);
}
