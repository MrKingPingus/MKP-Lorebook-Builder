// Settings → Editing & Entries → Templates. The full management surface half
// of Phase 12's locked decision 8.
//
// The ⋯ menu's picker already has a manage mode — rename, re-capture, delete,
// make a category — and that covers the things you notice while you are
// *using* a template. What it cannot do well is the bookkeeping: moving a
// template from one category to another, or re-parenting a category, both need
// you to see the whole set at once rather than one level of a drill-in. That is
// what this is for, and it is why the split exists rather than one surface
// doing both jobs badly.
//
// Everything here writes through `use-templates`, which persists on every
// mutation — there is no Save button and nothing to lose by closing the panel.
import { useState, useRef, useEffect } from 'react';
import { useTemplates } from '../../hooks/use-templates.js';
import {
  TEMPLATE_CATEGORY_COLORS, NEW_TEMPLATE_CATEGORY_NAME,
  UNCATEGORIZED_LABEL, TEMPLATE_NAME_LIMIT, MAX_TEMPLATES, TEMPLATE_FIELDS,
} from '../../constants/templates.js';

/** A name cell that commits on blur or Enter and reverts on Escape. */
function NameCell({ value, onCommit, ariaLabel, title }) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  function commit() {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== value) onCommit(name);
    else setDraft(value);
  }

  return (
    <input
      ref={ref}
      className="tpl-settings-name"
      value={draft}
      maxLength={TEMPLATE_NAME_LIMIT}
      aria-label={ariaLabel}
      title={title}
      onFocus={() => setEditing(true)}
      onChange={(e) => { setEditing(true); setDraft(e.target.value); }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter')  { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === 'Escape') { e.preventDefault(); setEditing(false); setDraft(value); e.currentTarget.blur(); }
      }}
    />
  );
}

export function TemplatesSettings() {
  const t = useTemplates();

  // Flat, with each row naming its own category — the drill-in shape belongs to
  // the picker, where you are navigating. Here you are auditing, and a flat
  // list is what lets you see that three near-identical scaffolds are filed in
  // three different places.
  const rows = [...t.templates].sort((a, b) => a.name.localeCompare(b.name));

  const categoryName = (id) =>
    t.categoryPath(id).map((c) => c.name || NEW_TEMPLATE_CATEGORY_NAME).join(' / ');

  function summary(tpl) {
    const held = t.contentFields(tpl);
    return TEMPLATE_FIELDS.filter((f) => held.includes(f.id)).map((f) => f.label).join(', ') || 'empty';
  }

  return (
    <div className="tpl-settings">
      <div className="settings-hint">
        Templates are shared by every lorebook. {t.templates.length} of {MAX_TEMPLATES} saved.
        Save one from an entry's <strong>⋯ → Templates</strong> menu.
      </div>

      {rows.length === 0 && (
        <div className="settings-hint">Nothing saved yet.</div>
      )}

      {rows.map((tpl) => (
        <div className="tpl-settings-row" key={tpl.id}>
          <NameCell
            value={tpl.name}
            ariaLabel={`Template name for ${tpl.name}`}
            title={`Fills in: ${summary(tpl)}`}
            onCommit={(name) => t.renameTemplate(tpl.id, name)}
          />
          <select
            className="hotbar-slot-select tpl-settings-cat"
            value={tpl.categoryId ?? ''}
            aria-label={`Category for ${tpl.name}`}
            onChange={(e) => t.moveTemplateToCategory(tpl.id, e.target.value || null)}
          >
            <option value="">{UNCATEGORIZED_LABEL}</option>
            {t.categories.map((c) => (
              <option key={c.id} value={c.id}>{categoryName(c.id)}</option>
            ))}
          </select>
          <button
            className="tpl-mini tpl-mini--danger"
            onClick={() => t.deleteTemplate(tpl.id)}
            title={`Delete "${tpl.name}"`}
            type="button"
          >
            ×
          </button>
        </div>
      ))}

      {/* Its own class, not `settings-divider`: this labels a run INSIDE one
          group, and the section's dividers are a structural list that a
          scenario reads. A sub-heading borrowing that class would put itself in
          the section's table of contents. */}
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
            ariaLabel={`Category name for ${c.name}`}
            onCommit={(name) => t.updateCategory(c.id, { name })}
          />
          <button
            className="tpl-mini tpl-mini--danger"
            onClick={() => t.deleteCategory(c.id)}
            title="Delete this category — its templates move to Uncategorized and its sub-categories move up a level"
            type="button"
          >
            ×
          </button>

          {/* Second line. Only parents this category could legally move under —
              the tree refuses cycles and over-deep moves, so an illegal option
              is never offered rather than offered and then rejected. */}
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

      <button
        className="settings-action-btn"
        onClick={() => t.createCategory({})}
        type="button"
      >
        ＋ New category
      </button>
    </div>
  );
}
