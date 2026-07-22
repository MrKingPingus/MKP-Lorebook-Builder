// Pure-logic checks for the keychord matcher. The Playwright suite runs on
// Linux only, so it can't catch platform-specific matching bugs — notably the
// macOS Option key, which rewrites e.key ("˜"/"Dead") while e.code stays
// physical ("KeyN"). These run in-process (no browser, no dev server) and stub
// navigator to exercise both the mac and non-mac branches of isMac().
import { matchesChord, chordFromEvent, formatChord } from '../src/services/keychord.js';

function withPlatform(platform, fn) {
  // Node 22 exposes a read-only navigator; override via defineProperty.
  const prev = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: { platform, userAgent: platform }, configurable: true, writable: true,
  });
  try { fn(); } finally {
    if (prev) Object.defineProperty(globalThis, 'navigator', prev);
    else delete globalThis.navigator;
  }
}

export function runKeychordChecks() {
  const results = [];
  const check = (label, got, want) => {
    const ok = got === want;
    results.push(ok);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expect ${JSON.stringify(want)})`);
  };

  console.log('\n▶ keychord matcher (pure logic)');

  withPlatform('MacIntel', () => {
    // Option rewrites the character; physical e.code must still match.
    check('Option+N (dead ˜) fires Alt+N', matchesChord({ altKey: true, key: '˜', code: 'KeyN' }, 'Alt+N'), true);
    check('Option+S (ß) fires Alt+S',       matchesChord({ altKey: true, key: 'ß', code: 'KeyS' }, 'Alt+S'), true);
    check('Option+E (dead) NOT Alt+H',      matchesChord({ altKey: true, key: 'Dead', code: 'KeyE' }, 'Alt+H'), false);
    check('capture Option+N → Alt+N',       chordFromEvent({ altKey: true, key: '˜', code: 'KeyN' }), 'Alt+N');
    check('Cmd+Z fires Mod+Z',              matchesChord({ metaKey: true, key: 'z', code: 'KeyZ' }, 'Mod+Z'), true);
    check('Ctrl+Z does NOT fire Mod+Z',     matchesChord({ ctrlKey: true, key: 'z', code: 'KeyZ' }, 'Mod+Z'), false);
    check('Cmd+comma fires Mod+,',          matchesChord({ metaKey: true, key: ',', code: 'Comma' }, 'Mod+,'), true);
    check('format Mod on mac',              formatChord('Mod+Z'), '⌘Z');
  });

  withPlatform('Win32', () => {
    check('Ctrl+Z fires Mod+Z (win)',       matchesChord({ ctrlKey: true, key: 'z', code: 'KeyZ' }, 'Mod+Z'), true);
    check('Win key+Z does NOT fire Mod+Z',  matchesChord({ metaKey: true, key: 'z', code: 'KeyZ' }, 'Mod+Z'), false);
    check('Alt+N fires Alt+N (win)',        matchesChord({ altKey: true, key: 'n', code: 'KeyN' }, 'Alt+N'), true);
    check('format Mod on win',              formatChord('Mod+Z'), 'Ctrl+Z');
  });

  // Symbol distinction — Shift-produced "?" must not collide with bare "/".
  check('bare / fires focus search',        matchesChord({ key: '/', code: 'Slash' }, '/'), true);
  check('Shift+/ (?) NOT bare /',           matchesChord({ key: '?', code: 'Slash', shiftKey: true }, '/'), false);
  check('? fires help',                     matchesChord({ key: '?', code: 'Slash', shiftKey: true }, '?'), true);
  // Exact modifier-set equality — no accidental subset matches.
  check('Alt+Shift+N NOT Alt+N',            matchesChord({ altKey: true, shiftKey: true, key: 'n', code: 'KeyN' }, 'Alt+N'), false);

  const passed = results.filter(Boolean).length;
  console.log(`  ${passed}/${results.length} keychord checks passed`);
  return results.every(Boolean);
}
