// Mobile breakpoint detection — true when the viewport is narrower than
// MOBILE_BREAKPOINT_PX. The only reader of that constant.
import { useState, useEffect } from 'react';
import { MOBILE_BREAKPOINT_PX } from '../constants/viewport.js';

export function useMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT_PX);

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX); }
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}
