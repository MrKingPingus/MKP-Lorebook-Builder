// Settings → Appearance: pick a theme and, in Custom mode, edit the seven core
// colors with a live text-on-background contrast readout.
import { useSettings } from '../../hooks/use-settings.js';
import { contrastRatio, contrastRating } from '../../hooks/use-theme.js';
import { THEMES, CUSTOM_CORE_TOKENS } from '../../constants/themes.js';

const DEFAULT_FOR = Object.fromEntries(CUSTOM_CORE_TOKENS.map((t) => [t.var, t.default]));

export function ThemeSettings() {
  const { theme, setTheme, customColors, setCustomColors } = useSettings();

  const colorFor = (v) => customColors?.[v] || DEFAULT_FOR[v];
  const setColor = (v, val) => setCustomColors({ ...customColors, [v]: val });

  const ratio  = contrastRatio(colorFor('--text'), colorFor('--bg'));
  const rating = contrastRating(ratio);

  return (
    <div className="theme-settings">
      <div className="theme-picker" role="radiogroup" aria-label="Color theme">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={theme === t.id}
            className={`theme-option${theme === t.id ? ' theme-option--active' : ''}`}
            onClick={() => setTheme(t.id)}
            title={t.hint}
          >
            <span className={`theme-swatch theme-swatch--${t.id}`} aria-hidden="true" />
            <span className="theme-option-label">{t.label}</span>
          </button>
        ))}
      </div>

      {theme === 'custom' && (
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
