// Pure keyboard-chord service — no React, no DOM registration.
// Owns the canonical chord grammar plus event matching, capture, display
// formatting, reserved-chord checks, and the one-time legacy-hotkey migration.
//
// Canonical chord grammar: modifier tokens in fixed order joined to the key by
// '+', e.g. "Mod+Shift+Z", "Alt+N", "Mod+,", "/", "Escape".
//   Mod   — the primary modifier: ⌘ on macOS, Ctrl elsewhere (cross-platform).
//   Ctrl  — the literal Control key (only distinct from Mod on macOS).
//   Meta  — the Windows/OS key on non-mac platforms.
//   Alt, Shift — as named.
// Keys are e.key with single characters upper-cased ("n" → "N"); named keys
// (Escape, Enter, ArrowLeft, F5, ']') are kept verbatim; ' ' becomes "Space".

import { RESERVED_CHORDS, LEGACY_HOTKEY_FIELDS } from '../constants/keybindings.js';

const MOD_ORDER = ['Mod', 'Ctrl', 'Alt', 'Shift', 'Meta'];
const LONE_MODIFIER_KEYS = ['Control', 'Alt', 'Shift', 'Meta', 'OS', 'Hyper', 'Super'];

function isMac() {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
}

function normalizeKey(key) {
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

// Layout/modifier-stable key for an event. Letters and digits are read from
// e.code (physical position) so they survive modifiers that rewrite e.key —
// notably macOS Option, where Option+N reports e.key "˜"/"Dead" but e.code
// stays "KeyN". Everything else (symbols, named keys) falls back to e.key so
// Shift-produced symbols like "?" vs "/" stay distinct.
function logicalKey(e) {
  const code = e.code || '';
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1];
  const digit = /^(?:Digit|Numpad)([0-9])$/.exec(code);
  if (digit) return digit[1];
  return normalizeKey(e.key);
}

// Reduce a keyboard event to the canonical logical-modifier set. This is the
// same vocabulary stored chords use, so event↔chord comparison is set equality.
function eventMods(e) {
  const mac = isMac();
  const set = new Set();
  const primary = mac ? e.metaKey : e.ctrlKey;
  if (primary) set.add('Mod');
  if (mac && e.ctrlKey) set.add('Ctrl');     // literal Control on mac
  if (!mac && e.metaKey) set.add('Meta');    // Windows/OS key
  if (e.altKey) set.add('Alt');
  if (e.shiftKey) set.add('Shift');
  return set;
}

function parseChord(chord) {
  const parts = chord.split('+');
  // A lone '+' key (chord === '+') splits oddly; guard the trivial cases.
  const key = parts.pop();
  return { mods: new Set(parts.filter(Boolean)), key };
}

function isBareSymbol(mods, key) {
  return mods.size === 0 && key.length === 1 && !/^[A-Z0-9]$/.test(key.toUpperCase());
}

/** True if the keyboard event fires the given canonical chord. */
export function matchesChord(e, chord) {
  if (!chord) return false;
  const { mods, key } = parseChord(chord);

  // Bare symbol keys (/, ?, etc.) — Shift is allowed to vary because Shift is
  // often what produces the symbol; only the primary/alt/meta must be absent.
  // Compared against e.key (not e.code) so the Shift-produced character wins.
  if (isBareSymbol(mods, key)) {
    const evMods = eventMods(e);
    if (evMods.has('Mod') || evMods.has('Ctrl') || evMods.has('Alt') || evMods.has('Meta')) return false;
    return e.key === key || normalizeKey(e.key) === key;
  }

  if (logicalKey(e).toUpperCase() !== key.toUpperCase()) return false;
  const evMods = eventMods(e);
  if (evMods.size !== mods.size) return false;
  for (const m of mods) if (!evMods.has(m)) return false;
  return true;
}

/** Build a canonical chord string from a keydown event (capture UI). Returns
 *  null for a lone modifier press so the capture stays "listening". */
export function chordFromEvent(e) {
  if (LONE_MODIFIER_KEYS.includes(e.key)) return null;
  const ordered = MOD_ORDER.filter((m) => eventMods(e).has(m));
  return [...ordered, logicalKey(e)].join('+');
}

/** Platform-aware display string, e.g. "Alt+N" or "⌘⇧Z". */
export function formatChord(chord) {
  if (!chord) return '';
  const mac = isMac();
  const { mods, key } = parseChord(chord);
  const label = {
    Mod:   mac ? '⌘' : 'Ctrl',
    Ctrl:  mac ? '⌃' : 'Ctrl',
    Alt:   mac ? '⌥' : 'Alt',
    Shift: mac ? '⇧' : 'Shift',
    Meta:  mac ? '⌘' : 'Win',
  };
  const parts = MOD_ORDER.filter((m) => mods.has(m)).map((m) => label[m] || m);
  parts.push(key === 'Space' ? 'Space' : key);
  return parts.join(mac ? '' : '+');
}

/** True if a chord must not be user-assigned (browser/OS reserved, or a bare
 *  alphanumeric key that would break typing). */
export function isReservedChord(chord) {
  if (!chord) return true;
  if (RESERVED_CHORDS.includes(chord)) return true;
  const { mods, key } = parseChord(chord);
  // Bare single alphanumeric key (no modifiers) — would fire while typing.
  if (mods.size === 0 && /^[A-Z0-9]$/.test(key.toUpperCase())) return true;
  return false;
}

/** One-time migration: fold legacy single-letter hotkey fields into the
 *  keybindings override map, then strip the legacy fields. Pure — returns a new
 *  settings object; callers persist it. */
export function migrateLegacyHotkeys(settings) {
  if (!settings || typeof settings !== 'object') return settings;
  const hasLegacy = LEGACY_HOTKEY_FIELDS.some((f) => f.field in settings);
  if (!hasLegacy) return settings;

  const next = { ...settings };
  const keybindings = { ...(settings.keybindings || {}) };
  for (const { field, id, modifier, legacyDefault } of LEGACY_HOTKEY_FIELDS) {
    const letter = settings[field];
    // Only carry forward a genuinely-customised letter; defaults come from the
    // registry. Never clobber an override the user already set post-migration.
    if (letter && letter !== legacyDefault && !(id in keybindings)) {
      const chord = modifier === 'Mod' ? `Mod+${String(letter).toUpperCase()}` : `${modifier}+${String(letter).toUpperCase()}`;
      keybindings[id] = chord;
    }
    delete next[field];
  }
  next.keybindings = keybindings;
  return next;
}
