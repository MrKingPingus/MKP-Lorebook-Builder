// Mobile breakpoint detection — true when the viewport is narrower than
// MOBILE_BREAKPOINT_PX. The only reader of that constant.
//
// It asks the browser the stylesheet's own question, through matchMedia,
// rather than comparing `window.innerWidth`. The two disagree at fractional
// widths: under display scaling a window can be 767.4 CSS px wide, which
// innerWidth rounds to 767 (mobile) while `@media (max-width: 767px)` does not
// match (desktop). The app then rendered its mobile layout without the mobile
// CSS that fills the screen, and shrank to a 600×666 box with the desktop
// hotbar floating in it (#126). Asking the same media query makes the two
// agree at every width, including the fractional ones.
import { useState, useEffect } from 'react';
import { MOBILE_BREAKPOINT_PX } from '../constants/viewport.js';

// Matches the stylesheet's `@media (max-width: 767px)` blocks exactly.
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`;

function matches() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

export function useMobile() {
  const [isMobile, setIsMobile] = useState(matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const check = () => setIsMobile(mql.matches);
    check(); // the width may have changed between first render and this effect
    mql.addEventListener('change', check);
    return () => mql.removeEventListener('change', check);
  }, []);

  return isMobile;
}
