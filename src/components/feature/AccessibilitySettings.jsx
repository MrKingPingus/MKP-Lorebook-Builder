// Settings → Appearance & Accessibility: text scale, reduced motion, and a
// high-contrast shortcut.
//
// The keyboard-shortcut editor lived here between 10D and 13B. It now sits
// under Layout & Controls with the other input surfaces (hotbar, FAB), grouped
// by what it changes. The `?` cheat sheet deep-links straight to it, which is
// how keyboard users actually reach it.
import { useSettings } from '../../hooks/use-settings.js';
import { UI_SCALE_STEPS } from '../../constants/accessibility.js';

export function AccessibilitySettings() {
  const {
    uiScale, setUiScale,
    reduceMotion, setReduceMotion,
    theme, setTheme,
  } = useSettings();

  const highContrast = theme === 'high-contrast';

  return (
    <div className="a11y-settings">
      <div className="settings-group">
        <div className="settings-label">Text size</div>
        <div className="a11y-scale-row" role="radiogroup" aria-label="Text size">
          {UI_SCALE_STEPS.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={uiScale === s.value}
              className={`a11y-scale-btn${uiScale === s.value ? ' a11y-scale-btn--active' : ''}`}
              onClick={() => setUiScale(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="settings-hint">Scales the app’s text. Layout spacing stays the same.</div>
      </div>

      <div className="settings-group">
        <label className="settings-label">
          <span>Reduce motion</span>
          <input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />
        </label>
        <div className="settings-hint">
          Turns off transitions and smooth scrolling. Your device’s “reduce motion” setting is always respected too.
        </div>
      </div>

      <div className="settings-group">
        <label className="settings-label">
          <span>High-contrast theme</span>
          <input
            type="checkbox"
            checked={highContrast}
            onChange={(e) => setTheme(e.target.checked ? 'high-contrast' : 'dark')}
          />
        </label>
        <div className="settings-hint">
          A maximum-contrast palette. You can also pick it — and other themes — just above.
        </div>
      </div>
    </div>
  );
}
