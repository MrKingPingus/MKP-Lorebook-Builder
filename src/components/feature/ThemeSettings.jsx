// Settings → Appearance: pick a theme and, in Custom mode, edit the seven core
// colors with a live text-on-background contrast readout.
import { useSettings } from '../../hooks/use-settings.js';
import { contrastRatio, contrastRating } from '../../hooks/use-theme.js';
import { useHostState } from '../../hooks/use-host.js';
import { THEMES, CUSTOM_CORE_TOKENS } from '../../constants/themes.js';

const DEFAULT_FOR = Object.fromEntries(CUSTOM_CORE_TOKENS.map((t) => [t.var, t.default]));

export function ThemeSettings() {
  const { theme, setTheme: setThemeSetting, customColors, setCustomColors: setCustomColorsSetting } = useSettings();

  // Host mode: CharSnap's palette is in force until the user picks something
  // here, which overrides it for this session only (the tokens are never
  // written to settings, so nothing leaks into the standalone app).
  const hostTokens    = useHostState((s) => s.themeTokens);
  const setHostTokens = useHostState((s) => s.setThemeTokens);
  const setTheme        = (v) => { if (hostTokens) setHostTokens(null); setThemeSetting(v); };
  const setCustomColors = (v) => { if (hostTokens) setHostTokens(null); setCustomColorsSetting(v); };

  const colorFor = (v) => customColors?.[v] || DEFAULT_FOR[v];
  const setColor = (v, val) => setCustomColors({ ...customColors, [v]: val });

  const ratio  = contrastRatio(colorFor('--text'), colorFor('--bg'));
  const rating = contrastRating(ratio);

  return (
    <div className="theme-settings">
      {hostTokens && (
        <div className="settings-hint host-theme-note">
          Theme set by CharSnap. Pick one below to override it for this session.
        </div>
      )}
      <div className="theme-picker" role="radiogroup" aria-label="Color theme">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={!hostTokens && theme === t.id}
            className={`theme-option${!hostTokens && theme === t.id ? ' theme-option--active' : ''}`}
            onClick={() => setTheme(t.id)}
            title={t.hint}
          >
            <span className={`theme-swatch theme-swatch--${t.id}`} aria-hidden="true" />
            <span className="theme-option-label">{t.label}</span>
          </button>
        ))}
      </div>

      {theme === 'custom' && !hostTokens && (
        <div className="theme-custom">
          <div className="settings-hint">
            Seven core colors — panels, borders, and accents are shaded from these.
          </div>
          {CUSTOM_CORE_TOKENS.map((t) => (
            <label key={t.var} className="theme-color-row">
              <span className="theme-color-label">{t.label}</span>
              <input
                type="color"
                className="theme-color-input"
                value={colorFor(t.var)}
                onChange={(e) => setColor(t.var, e.target.value)}
                aria-label={t.label}
              />
            </label>
          ))}
          <div className="theme-contrast">
            <span>Text on background</span>
            <strong>{ratio ? `${ratio.toFixed(1)}:1` : '—'}</strong>
            <span className={`theme-contrast-badge theme-contrast-badge--${rating.replace(/\s+/g, '').toLowerCase()}`}>
              {rating}
            </span>
          </div>
          <button type="button" className="theme-reset" onClick={() => setCustomColors({})}>
            Reset custom colors
          </button>
        </div>
      )}
    </div>
  );
}
