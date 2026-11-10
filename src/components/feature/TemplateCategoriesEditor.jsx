// Templates manager → Categories & options. The bookkeeping half: categories
// (name, colour, where each one nests) and the two opt-in save options.
//
// Everything writes through `use-templates` / `use-settings`, which persist on
// every change — there is no Save button and nothing to lose by closing.
import { useTemplates } from '../../hooks/use-templates.js';
import { useSettings }  from '../../hooks/use-settings.js';
import { NameCell }     from '../ui/NameCell.jsx';
import {
  TEMPLATE_CATEGORY_COLORS, NEW_TEMPLATE_CATEGORY_NAME, UNCATEGORIZED_LABEL,
  TEMPLATE_NAME_LIMIT, TEMPLATE_OPTIONAL_FIELDS,
} from '../../constants/templates.js';

export function TemplateCategoriesEditor() {
  const t        = useTemplates();
  const settings = useSettings();

  const categoryName = (id) =>
    t.categoryPath(id).map((c) => c.name || NEW_TEMPLATE_CATEGORY_NAME).join(' / ');

  // The setters follow the settings' own names: templateSaveCondition →
  // setTemplateSaveCondition.
  const setterFor = (setting) => settings[`set${setting[0].toUpperCase()}${setting.slice(1)}`];

  return (
    <div className="tpl-settings">
      <div className="tpl-settings-heading" role="presentation">Categories</div>

      {t.categories.length === 0 && (
        <div className="settings-hint">
          No categories. Templates without one show under {UNCATEGORIZED_LABEL}.
        </div>
      )}

      {t.categories.map((c) => (
        <div className="tpl-settings-row tpl-settings-row--category" key={c.id}>
          <span className="entry-actions-dot" style={{ background: c.color }} />
          <NameCell
            value={c.name || NEW_TEMPLATE_CATEGORY_NAME}
            maxLength={TEMPLATE_NAME_LIMIT}
            ariaLabel={`Category name for ${c.name}`}
            onCommit={(name) => t.updateCategory(c.id, { name })}
          />
          <button
            className="tpl-mini tpl-mini--danger"
            onClick={() => t.deleteCategory(c.id)}
            title="Delete this category. Its templates move to Uncategorized and its sub-categories move up a level."
            type="button"
          >
            ×
          </button>

          {/* Only parents this category could legally move under — the tree
              refuses cycles and over-deep moves, so an illegal option is never
              offered rather than offered and then rejected. */}
          <select
            className="hotbar-slot-select tpl-settings-cat"
            value={c.parentId ?? ''}
            aria-label={`Parent category for ${c.name}`}
            onChange={(e) => t.moveCategory(c.id, e.target.value || null)}
          >
            <option value="">Top level</option>
            {t.categories
              .filter((p) => p.id !== c.id && t.canNestCategory(c.id, p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>{categoryName(p.id)}</option>
              ))}
          </select>
          <select
            className="hotbar-slot-select tpl-settings-color"
            value={c.color}
            aria-label={`Colour for ${c.name}`}
            onChange={(e) => t.updateCategory(c.id, { color: e.target.value })}
          >
            {TEMPLATE_CATEGORY_COLORS.map((s) => (
              <option key={s.id} value={s.color}>{s.label}</option>
            ))}
          </select>
        </div>
      ))}

      <button className="settings-action-btn" onClick={() => t.createCategory({})} type="button">
        ＋ New category
      </button>

      <div className="tpl-settings-heading" role="presentation">Options</div>
      <div className="settings-hint">
        A template normally holds an entry's title, type, triggers and description.
        These two belong to one entry more often than to a kind of entry, so they
        are left out unless you turn them on. Templates you already saved are not changed.
      </div>
      {TEMPLATE_OPTIONAL_FIELDS.map((f) => (
        <label className="tpl-option" key={f.id}>
          <input
            type="checkbox"
            checked={settings[f.setting] === true}
            onChange={(e) => setterFor(f.setting)(e.target.checked)}
          />
          <span>{f.label}</span>
        </label>
      ))}
    </div>
  );
}
