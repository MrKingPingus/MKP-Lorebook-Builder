// Keeps document accessibility state in sync with settings (mounted once in
// App). Initial values are also applied pre-render in main.jsx to avoid a
// resize flash. Also exposes a scroll-behavior helper components use so their
// smooth scrolls jump when reduced motion is on.
import { useEffect } from 'react';
import { useSettingsStore } from '../state/settings-store.js';
import { applyUiScale, applyReduceMotion, reducedMotionActive } from '../services/accessibility-service.js';

export { reducedMotionActive } from '../services/accessibility-service.js';

/** 'auto' when reduced motion is active, else 'smooth' — for scrollIntoView. */
export function reducedMotionScrollBehavior() {
  return reducedMotionActive() ? 'auto' : 'smooth';
}

export function useAccessibility() {
  const uiScale      = useSettingsStore((s) => s.uiScale);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  useEffect(() => { applyUiScale(uiScale); }, [uiScale]);
  useEffect(() => { applyReduceMotion(reduceMotion); }, [reduceMotion]);
}
