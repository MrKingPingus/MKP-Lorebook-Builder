// Applies accessibility preferences to the document. Plain service — touches
// the DOM (root --ui-scale var + data-reduce-motion attribute) but never
// localStorage and never React.

/** Set the root text-scale multiplier (font sizes are rem; this scales rem). */
export function applyUiScale(scale) {
  if (typeof document === 'undefined') return;
  const s = Number(scale) || 1;
  document.documentElement.style.setProperty('--ui-scale', String(s));
}

/** Force reduced motion on/off. The OS setting is honoured independently via a
 *  CSS media query; this attribute lets the user force it regardless. */
export function applyReduceMotion(on) {
  if (typeof document === 'undefined') return;
  if (on) document.documentElement.setAttribute('data-reduce-motion', 'true');
  else    document.documentElement.removeAttribute('data-reduce-motion');
}

/** True if reduced motion is active — either the user's toggle or the OS. Used
 *  to make JS smooth-scrolls jump instead. */
export function reducedMotionActive() {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.getAttribute('data-reduce-motion') === 'true') return true;
  return !!(typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
