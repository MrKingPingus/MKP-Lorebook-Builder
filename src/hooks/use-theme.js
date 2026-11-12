// Keeps the document theme in sync with settings. Mounted once (App). The
// initial apply also happens pre-render in main.jsx to avoid a flash; this
// covers every later change to the theme or custom colors.
import { useEffect } from 'react';
import { useSettingsStore } from '../state/settings-store.js';
import { useHostStore }     from '../state/host-store.js';
import { applyTheme } from '../services/theme-service.js';

// Re-exported so components reach contrast math through the hook layer rather
// than importing the service directly (the custom-theme editor uses these).
export { contrastRatio, contrastRating } from '../services/theme-service.js';

export function useTheme() {
  const theme        = useSettingsStore((s) => s.theme);
  const customColors = useSettingsStore((s) => s.customColors);
  // Host mode: CharSnap pushes its palette as the seven custom-theme tokens.
  // They live only in host-store — never in settings, never in localStorage —
  // so the user's own theme choice is exactly as they left it when they are
  // back in the standalone app. Null in standalone, so the path below is the
  // same as it always was.
  const hostTokens   = useHostStore((s) => s.themeTokens);
  useEffect(() => {
    if (hostTokens) {
      applyTheme('custom', hostTokens);
      return undefined;
    }
    applyTheme(theme, customColors);
    // While on 'system', re-resolve when the OS light/dark preference flips.
    if (theme !== 'system' || typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system', customColors);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme, customColors, hostTokens]);
}
