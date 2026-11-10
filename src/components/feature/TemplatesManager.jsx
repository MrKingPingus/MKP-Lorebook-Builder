// The Templates manager: one floating window for everything templates do.
//
// It replaced three surfaces that each did part of the job: a hover submenu in
// the entry's ⋯ menu (save, pick, a cramped manage mode), a popover above the
// + button (pick only), and a Templates block in Settings (the bookkeeping).
// Testers found the submenu awkward — it closed under the pointer and drilled
// in one level at a time — and the split meant where you were decided what you
// could do. Every route in now opens this, and it stays put until closed.
//
// `templatesManager.entryId` says which entry it was opened from. With one,
// "Save this entry", "Fill this entry" and "Update from this entry" are on
// offer; without one (the + menu, Shift+Alt+N, the empty list, Settings) only
// "New entry from this" is, since there is no entry to read or fill.
import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useUi }           from '../../hooks/use-ui.js';
import { useEntries }      from '../../hooks/use-entries.js';
import { useTemplates }    from '../../hooks/use-templates.js';
import { useDismissLayer } from '../../hooks/use-dismiss-layer.js';
import { useConfirmPress } from '../../hooks/use-confirm-press.js';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';
import { NameCell }        from '../ui/NameCell.jsx';
import { TemplateCategoriesEditor } from './TemplateCategoriesEditor.jsx';
import {
  TEMPLATE_FIELDS, TEMPLATE_NAME_LIMIT, MAX_TEMPLATES, UNCATEGORIZED_LABEL,
  NEW_TEMPLATE_CATEGORY_NAME, DESCRIPTION_APPEND, DESCRIPTION_OVERWRITE,
} from '../../constants/templates.js';

const TAB_TEMPLATES  = 'templates';
const TAB_CATEGORIES = 'categories';

export function TemplatesManager() {
  const manager = useUi((s) => s.templatesManager);
  const close   = useUi((s) => s.closeTemplatesManager);
  const open    = manager !== null;

  useDismissLayer('templates-manager', open, DISMISS_PRIORITY.modal, close);

  if (!open) return null;
  return createPortal(
    <div className="tpl-manager-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <ManagerWindow entryId={manager.entryId} onClose={close} />
    </div>,
    document.body,
  );
}

// Separate from the shell so its state starts fresh each time the window opens.
function ManagerWindow({ entryId, onClose }) {
  const t           = useTemplates();
  const { entries } = useEntries();
  const entry       = entryId ? (entries.find((e) => e.id === entryId) ?? null) : null;
  const entryLabel  = entry ? (entry.name?.trim() || 'this entry') : null;

  const [tab, setTab]           = useState(TAB_TEMPLATES);
  const [selectedId, setSelect] = useState(null);
  const [fields, setFields]     = useState([]);
  const [descMode, setDescMode] = useState(DESCRIPTION_APPEND);
  const [saving, setSaving]     = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveCat, setSaveCat]   = useState('');
  const confirmDelete = useConfirmPress();
  const saveRef  = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => { if (saving) saveRef.current?.select(); }, [saving]);

  const categoryName = (id) =>
    t.categoryPath(id).map((c) => c.name || NEW_TEMPLATE_CATEGORY_NAME).join(' / ');

  // Uncategorized first, then every category in tree order. A category with
  // nothing in it gets no heading here; it is still listed under Categories.
  const groups = useMemo(() => {
    const out = [];
    const loose = t.inCategory(null);
    if (loose.length) out.push({ id: null, label: UNCATEGORIZED_LABEL, color: null, templates: loose });
    const walk = (parentId) => {
      for (const c of t.childCategories(parentId)) {
        const inside = t.inCategory(c.id);
        if (inside.length) out.push({ id: c.id, label: categoryName(c.id), color: c.color, templates: inside });
        walk(c.id);
      }
    };
    walk(null);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.templates, t.categories]);

  const selected = t.templates.find((x) => x.id === selectedId) ?? null;
  const held     = selected ? t.contentFields(selected) : [];
  const collides = !!(selected && entry && t.descriptionWouldCollide(selected, entry, fields));

  function select(tpl) {
    setSelect(tpl.id);
    setDescMode(DESCRIPTION_APPEND);   // the non-destructive option leads
    confirmDelete.disarm();
  }

  // Everything the template holds is ticked by default. Keyed on the payload,
  // so "Update from this entry" re-ticks to match what the template holds now,
  // while a rename or a category change leaves the ticks alone.
  const payload = selected?.payload;
  useEffect(() => {
    setFields(selected ? t.contentFields(selected) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, payload]);

  function toggleField(id) {
    setFields((cur) => (cur.includes(id) ? cur.filter((f) => f !== id) : [...cur, id]));
  }

  function startSave() {
    setSaveName(entry?.name ?? '');
    setSaveCat('');
    setSaving(true);
  }

  function commitSave() {
    const made = t.saveEntryAsTemplate(entry, { name: saveName, categoryId: saveCat || null });
    setSaving(false);
    if (made) select(made);
  }

  function fill() {
    t.fillEntryFromTemplate(entry.id, selected, { fields, descriptionMode: descMode });
    onClose();
  }

  function createNew() {
    t.createEntryFromTemplate(selected, { fields });
    onClose();
  }

  function remove() {
    confirmDelete.press(selected.id, true, () => {
      t.deleteTemplate(selected.id);
      setSelect(null);
    });
  }

  const fieldLabel = (id) => TEMPLATE_FIELDS.find((f) => f.id === id)?.label ?? id;

  return (
    <div
      className="tpl-manager"
      role="dialog"
      aria-modal="true"
      aria-label="Templates"
      onKeyDown={(e) => {
        // The global Escape handler stands down while any <input> has focus,
        // so that text fields keep their own Escape. A ticked checkbox or
        // radio is an <input> too, and would leave Escape doing nothing.
        if (e.key === 'Escape' && e.target.tagName === 'INPUT' && ['checkbox', 'radio'].includes(e.target.type)) {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div className="tpl-manager-header">
        <h2 className="tpl-manager-title">Templates</h2>
        <span className="tpl-manager-count">{t.templates.length} of {MAX_TEMPLATES} · shared by every lorebook</span>
        <button ref={closeRef} className="tpl-manager-close touch-floor" onClick={onClose} aria-label="Close" type="button">✕</button>
      </div>

      <div className="tpl-manager-tabs" role="tablist">
        <button
          type="button" role="tab" aria-selected={tab === TAB_TEMPLATES}
          className={`tpl-manager-tab${tab === TAB_TEMPLATES ? ' tpl-manager-tab--on' : ''}`}
          onClick={() => setTab(TAB_TEMPLATES)}
        >
          Templates
        </button>
        <button
          type="button" role="tab" aria-selected={tab === TAB_CATEGORIES}
          className={`tpl-manager-tab${tab === TAB_CATEGORIES ? ' tpl-manager-tab--on' : ''}`}
          onClick={() => setTab(TAB_CATEGORIES)}
        >
          Categories &amp; options
        </button>
      </div>

      {tab === TAB_CATEGORIES ? (
        <div className="tpl-manager-body tpl-manager-body--single">
          <TemplateCategoriesEditor />
        </div>
      ) : (
        <div className="tpl-manager-body">
          {/* ── the list ─────────────────────────────────────────────────── */}
          <div className="tpl-list">
            {entry && !saving && (
              <button
                type="button"
                className="tpl-save-btn"
                onClick={startSave}
                disabled={t.atCapacity}
                title={t.atCapacity ? `The library is full (${MAX_TEMPLATES}). Delete a template to save another.` : undefined}
              >
                ＋ Save “{entryLabel}” as a template
              </button>
            )}
            {entry && saving && (
              <div className="tpl-save-form">
                <input
                  ref={saveRef}
                  className="tpl-save-input"
                  value={saveName}
                  maxLength={TEMPLATE_NAME_LIMIT}
                  placeholder="Template name"
                  aria-label="Template name"
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter')  { e.preventDefault(); commitSave(); }
                    if (e.key === 'Escape') { e.preventDefault(); setSaving(false); }
                  }}
                />
                <select
                  className="hotbar-slot-select tpl-save-cat"
                  value={saveCat}
                  aria-label="Category for the new template"
                  onChange={(e) => setSaveCat(e.target.value)}
                >
                  <option value="">{UNCATEGORIZED_LABEL}</option>
                  {t.categories.map((c) => <option key={c.id} value={c.id}>{categoryName(c.id)}</option>)}
                </select>
                <div className="tpl-save-actions">
                  <button type="button" className="tpl-btn tpl-btn--primary tpl-save-commit" onClick={commitSave}>Save</button>
                  <button type="button" className="tpl-btn" onClick={() => setSaving(false)}>Cancel</button>
                </div>
              </div>
            )}

            {groups.length === 0 && (
              <p className="tpl-empty">
                Nothing saved yet.{' '}
                {entry
                  ? 'Save this entry to reuse its shape in any lorebook.'
                  : 'Open an entry’s ⋯ menu and choose Templates to save one.'}
              </p>
            )}

            {groups.map((g) => (
              <div className="tpl-group" key={g.id ?? 'none'}>
                <div className="tpl-list-heading">
                  {g.color && <span className="entry-actions-dot" style={{ background: g.color }} />}
                  {g.label}
                </div>
                {g.templates.map((tpl) => (
                  <button
                    type="button"
                    key={tpl.id}
                    className={`tpl-list-row${tpl.id === selectedId ? ' tpl-list-row--on' : ''}`}
                    aria-pressed={tpl.id === selectedId}
                    onClick={() => select(tpl)}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* ── the selected template ────────────────────────────────────── */}
          <div className="tpl-detail">
            {!selected ? (
              <p className="tpl-empty">
                {groups.length > 0 ? 'Pick a template to use or edit it.' : ''}
              </p>
            ) : (
              <>
                <NameCell
                  className="tpl-detail-name"
                  value={selected.name}
                  maxLength={TEMPLATE_NAME_LIMIT}
                  ariaLabel="Template name"
                  title="Rename this template"
                  onCommit={(name) => t.renameTemplate(selected.id, name)}
                />
                <label className="tpl-detail-line">
                  <span className="tpl-detail-label">Category</span>
                  <select
                    className="hotbar-slot-select tpl-detail-cat"
                    value={selected.categoryId ?? ''}
                    onChange={(e) => t.moveTemplateToCategory(selected.id, e.target.value || null)}
                  >
                    <option value="">{UNCATEGORIZED_LABEL}</option>
                    {t.categories.map((c) => <option key={c.id} value={c.id}>{categoryName(c.id)}</option>)}
                  </select>
                </label>

                {t.templatePreview(selected) && (
                  <p className="tpl-preview">{t.templatePreview(selected)}</p>
                )}

                {held.length === 0 ? (
                  <p className="tpl-empty">This template is empty.</p>
                ) : (
                  <fieldset className="tpl-fields">
                    <legend className="tpl-detail-label">Use these parts</legend>
                    {held.map((id) => (
                      <label className="tpl-field-check" key={id}>
                        <input type="checkbox" checked={fields.includes(id)} onChange={() => toggleField(id)} />
                        <span>{fieldLabel(id)}</span>
                      </label>
                    ))}
                  </fieldset>
                )}

                {collides && (
                  <fieldset className="tpl-fields tpl-desc-mode">
                    <legend className="tpl-detail-label">“{entryLabel}” already has a description</legend>
                    <label className="tpl-field-check">
                      <input type="radio" name="tpl-desc-mode" checked={descMode === DESCRIPTION_APPEND} onChange={() => setDescMode(DESCRIPTION_APPEND)} />
                      <span>Add the template’s below it</span>
                    </label>
                    <label className="tpl-field-check">
                      <input type="radio" name="tpl-desc-mode" checked={descMode === DESCRIPTION_OVERWRITE} onChange={() => setDescMode(DESCRIPTION_OVERWRITE)} />
                      <span>Replace it</span>
                    </label>
                  </fieldset>
                )}

                <div className="tpl-detail-actions">
                  {entry && (
                    <button type="button" className="tpl-btn tpl-btn--primary tpl-fill-btn" onClick={fill} disabled={fields.length === 0}>
                      Fill “{entryLabel}”
                    </button>
                  )}
                  <button type="button" className={`tpl-btn tpl-new-btn${entry ? '' : ' tpl-btn--primary'}`} onClick={createNew} disabled={fields.length === 0}>
                    New entry from this
                  </button>
                </div>

                <div className="tpl-detail-actions tpl-detail-actions--manage">
                  {entry && (
                    <button
                      type="button"
                      className="tpl-btn tpl-recapture-btn"
                      onClick={() => t.overwriteTemplate(selected.id, entry)}
                      title={`Replace what this template holds with “${entryLabel}” as it is now. Its name and category stay.`}
                    >
                      ⟳ Update from “{entryLabel}”
                    </button>
                  )}
                  <button
                    type="button"
                    className={`tpl-btn tpl-btn--danger tpl-delete-btn${confirmDelete.armedId === selected.id ? ' tpl-btn--armed' : ''}`}
                    onClick={remove}
                    onBlur={confirmDelete.disarm}
                  >
                    {confirmDelete.armedId === selected.id ? 'Click again to delete' : 'Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
