// The Entry Templates picker (Phase 12, GitHub #114) — browse, save, load.
//
// It is its own component rather than part of `EntryActionsMenu` because it has
// two homes, and the second one is the reason locked decision 2 needed a
// placement at all. The ⋯ menu hangs off a specific entry; a book with **no
// entries has no ⋯ menu**, so a fresh book could never reach its own templates.
// The entry list's empty state opens the same panel, with no entry behind it.
//
// That is also why `entry` is nullable, and why the two load actions live
// together on the checklist rather than being separate menu items: you pick a
// template, see what it holds, and only then say whether it lands in the entry
// you have open or in a new one. Where it goes is a decision worth making with
// the contents in front of you, and with no entry open, "Fill this entry"
// simply isn't offered.
//
// Three views, not a wizard: browse (categories + templates), save (a name
// field), load (the content checklist). Browse is where you start and where
// every path returns.
import { useState, useRef, useEffect } from 'react';
import { useTemplates } from '../../hooks/use-templates.js';
import {
  TEMPLATE_FIELDS, DESCRIPTION_APPEND, DESCRIPTION_OVERWRITE,
  TEMPLATES_ROOT_LABEL, NEW_TEMPLATE_CATEGORY_NAME,
  MAX_TEMPLATES, TEMPLATE_NAME_LIMIT,
} from '../../constants/templates.js';

const VIEW_BROWSE = 'browse';
const VIEW_SAVE   = 'save';
const VIEW_LOAD   = 'load';

export function TemplatesPanel({ entry, onDone, onPin }) {
  const t = useTemplates();

  const [view, setView]         = useState(VIEW_BROWSE);
  const [categoryId, setCatId]  = useState(null);   // which category we are inside
  const [chosen, setChosen]     = useState(null);   // the template being loaded
  const [fields, setFields]     = useState([]);     // ticked checklist fields
  const [descMode, setDescMode] = useState(DESCRIPTION_APPEND);
  const [saveName, setSaveName] = useState('');
  const [managing, setManaging] = useState(false);
  const [renaming, setRenaming] = useState(null);   // { kind: 'template'|'category', id }
  const [renameText, setRename] = useState('');
  const saveRef   = useRef(null);
  const renameRef = useRef(null);

  const subCategories = t.childCategories(categoryId);
  const here          = t.inCategory(categoryId);
  const path          = t.categoryPath(categoryId);

  // Any view holding half-typed text must keep its host popover open — the
  // flyout in the ⋯ menu closes on a hover timer otherwise, and a name typed
  // and then abandoned by a stray mouse movement is the worst kind of loss.
  useEffect(() => {
    onPin?.(view !== VIEW_BROWSE || !!renaming);
  }, [view, renaming, onPin]);

  useEffect(() => { if (view === VIEW_SAVE) saveRef.current?.focus(); }, [view]);
  useEffect(() => { if (renaming) renameRef.current?.focus(); }, [renaming]);

  function backToBrowse() {
    setView(VIEW_BROWSE);
    setChosen(null);
    setRenaming(null);
  }

  // ── save ──────────────────────────────────────────────────────────────────
  function openSave() {
    setSaveName(entry?.name ?? '');
    setView(VIEW_SAVE);
  }

  function commitSave() {
    // Files into whichever category you are standing in, which is the only
    // reading of "save here" that matches what the panel is showing.
    t.saveEntryAsTemplate(entry, { name: saveName, categoryId });
    backToBrowse();
  }

  // ── load ──────────────────────────────────────────────────────────────────
  function openLoad(template) {
    const available = t.contentFields(template);
    setChosen(template);
    setFields(available);            // everything ticked by default
    setDescMode(DESCRIPTION_APPEND); // the non-destructive option leads
    // A description-only template has nothing to choose between, so it skips
    // the checklist — unless it would land on text, which is a real question.
    if (!t.needsChecklist(template) && !t.descriptionWouldCollide(template, entry, available)) {
      applyTo(template, available, 'fill');
      return;
    }
    setView(VIEW_LOAD);
  }

  function toggleField(id) {
    setFields((cur) => (cur.includes(id) ? cur.filter((f) => f !== id) : [...cur, id]));
  }

  function applyTo(template, picked, where) {
    if (where === 'fill') t.fillEntryFromTemplate(entry.id, template, { fields: picked, descriptionMode: descMode });
    else                  t.createEntryFromTemplate(template, { fields: picked });
    onDone?.();
  }

  const collides = chosen && t.descriptionWouldCollide(chosen, entry, fields);

  // ── rename, shared by templates and categories ────────────────────────────
  function commitRename() {
    const name = renameText.trim();
    if (name && renaming) {
      if (renaming.kind === 'template') t.renameTemplate(renaming.id, name);
      else                              t.updateCategory(renaming.id, { name });
    }
    setRenaming(null);
  }

  function renameRow(kind, id, current) {
    setRenaming({ kind, id });
    setRename(current);
  }

  const renameField = (
    <div className="entry-actions-input-row">
      <input
        ref={renameRef}
        className="entry-actions-input"
        value={renameText}
        maxLength={TEMPLATE_NAME_LIMIT}
        onChange={(e) => setRename(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter')  { e.preventDefault(); commitRename(); }
          if (e.key === 'Escape') { e.preventDefault(); setRenaming(null); }
        }}
        aria-label="New name"
      />
      <button className="entry-actions-go" onClick={commitRename} type="button" aria-label="Rename">→</button>
    </div>
  );

  // ── the load checklist ────────────────────────────────────────────────────
  if (view === VIEW_LOAD && chosen) {
    const available = t.contentFields(chosen);
    return (
      <>
        <button className="entry-actions-back" onClick={backToBrowse} type="button">
          ‹ {chosen.name}
        </button>

        {/* Only the fields this template actually holds — a checklist of four
            boxes where three are empty is a worse question than no question. */}
        <div className="tpl-checklist">
          {TEMPLATE_FIELDS.filter((f) => available.includes(f.id)).map((f) => (
            <label key={f.id} className="tpl-check">
              <input
                type="checkbox"
                checked={fields.includes(f.id)}
                onChange={() => toggleField(f.id)}
              />
              <span>{f.label}</span>
            </label>
          ))}
        </div>

        {collides && (
          <div className="tpl-conflict">
            <div className="tpl-conflict-note">This entry already has a description.</div>
            <div className="tpl-conflict-choice" role="radiogroup" aria-label="Existing description">
              {[
                [DESCRIPTION_APPEND,    'Append'],
                [DESCRIPTION_OVERWRITE, 'Overwrite'],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  className={`tpl-conflict-btn${descMode === mode ? ' tpl-conflict-btn--on' : ''}`}
                  onClick={() => setDescMode(mode)}
                  role="radio"
                  aria-checked={descMode === mode}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="entry-actions-divider" role="separator" />

        {/* Both load actions (locked decision 2), chosen with the contents in
            front of you. "Fill this entry" is absent when there is no entry —
            the empty-state route into this panel has nothing to fill. */}
        {entry && (
          <button
            className="entry-actions-item"
            onClick={() => applyTo(chosen, fields, 'fill')}
            disabled={fields.length === 0}
            role="menuitem"
            type="button"
          >
            <span className="entry-actions-item-label">Fill this entry</span>
          </button>
        )}
        <button
          className="entry-actions-item"
          onClick={() => applyTo(chosen, fields, 'new')}
          disabled={fields.length === 0}
          role="menuitem"
          type="button"
        >
          <span className="entry-actions-item-label">New entry from this</span>
        </button>
      </>
    );
  }

  // ── save ──────────────────────────────────────────────────────────────────
  if (view === VIEW_SAVE) {
    return (
      <>
        <button className="entry-actions-back" onClick={backToBrowse} type="button">
          ‹ Save as template
        </button>
        <div className="entry-actions-input-row">
          <input
            ref={saveRef}
            className="entry-actions-input"
            value={saveName}
            maxLength={TEMPLATE_NAME_LIMIT}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter')  { e.preventDefault(); commitSave(); }
              if (e.key === 'Escape') { e.preventDefault(); backToBrowse(); }
            }}
            placeholder="Template name…"
            spellCheck={false}
            aria-label="Template name"
          />
          <button className="entry-actions-go" onClick={commitSave} type="button" aria-label="Save template">→</button>
        </div>
        <div className="entry-actions-note">
          Saves this entry's title, type, triggers and description
          {categoryId ? ` into ${path.at(-1)?.name || NEW_TEMPLATE_CATEGORY_NAME}` : ''}.
        </div>
      </>
    );
  }

  // ── browse ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Breadcrumb — one level up per press, so a drill-in is always
          reversible without closing the panel. */}
      {categoryId && (
        <button
          className="entry-actions-back"
          onClick={() => setCatId(path.length > 1 ? path.at(-2).id : null)}
          type="button"
        >
          ‹ {path.length > 1 ? path.at(-2).name : TEMPLATES_ROOT_LABEL}
        </button>
      )}

      {subCategories.map((c) => (
        renaming?.kind === 'category' && renaming.id === c.id ? (
          <div key={c.id}>{renameField}</div>
        ) : (
          <div className="tpl-row" key={c.id}>
            <button
              className="entry-actions-item"
              onClick={() => setCatId(c.id)}
              role="menuitem"
              type="button"
            >
              <span className="entry-actions-dot" style={{ background: c.color }} />
              <span className="entry-actions-item-label">{c.name || NEW_TEMPLATE_CATEGORY_NAME}</span>
              <span className="entry-actions-chevron" aria-hidden="true">›</span>
            </button>
            {managing && (
              <>
                <button className="tpl-mini" onClick={() => renameRow('category', c.id, c.name)} title="Rename category" type="button">✎</button>
                <button className="tpl-mini tpl-mini--danger" onClick={() => t.deleteCategory(c.id)} title="Delete category — its templates move to Uncategorized" type="button">×</button>
              </>
            )}
          </div>
        )
      ))}

      {here.map((tpl) => (
        renaming?.kind === 'template' && renaming.id === tpl.id ? (
          <div key={tpl.id}>{renameField}</div>
        ) : (
          <div className="tpl-row" key={tpl.id}>
            <button
              className="entry-actions-item"
              onClick={() => openLoad(tpl)}
              title={t.templatePreview(tpl) || 'No description in this template'}
              role="menuitem"
              type="button"
            >
              <span className="entry-actions-item-label">{tpl.name}</span>
            </button>
            {managing && (
              <>
                <button className="tpl-mini" onClick={() => renameRow('template', tpl.id, tpl.name)} title="Rename template" type="button">✎</button>
                {entry && (
                  <button className="tpl-mini" onClick={() => t.overwriteTemplate(tpl.id, entry)} title="Replace this template's contents with this entry" type="button">⟳</button>
                )}
                <button className="tpl-mini tpl-mini--danger" onClick={() => t.deleteTemplate(tpl.id)} title="Delete template" type="button">×</button>
              </>
            )}
          </div>
        )
      ))}

      {subCategories.length === 0 && here.length === 0 && (
        <div className="entry-actions-note">
          {categoryId
            ? 'Nothing filed here yet.'
            : entry
              ? 'No templates yet. Save this entry as one below and it will be here for every lorebook.'
              : 'No templates yet. Open an entry and save it as a template first.'}
        </div>
      )}

      <div className="entry-actions-divider" role="separator" />

      {entry && (
        <button
          className="entry-actions-item"
          onClick={openSave}
          disabled={t.atCapacity}
          title={t.atCapacity ? `You already have the maximum of ${MAX_TEMPLATES} templates` : undefined}
          role="menuitem"
          type="button"
        >
          <span className="entry-actions-item-label">＋ Save this entry as a template…</span>
        </button>
      )}

      <button
        className="entry-actions-item"
        onClick={() => setManaging((v) => !v)}
        role="menuitemcheckbox"
        aria-checked={managing}
        type="button"
      >
        <span className="entry-actions-item-label">{managing ? 'Done managing' : 'Manage…'}</span>
        <span className="entry-actions-tick" aria-hidden="true">{managing ? '✓' : ''}</span>
      </button>

      {managing && (
        <button
          className="entry-actions-item"
          onClick={() => {
            const made = t.createCategory({ parentId: categoryId });
            renameRow('category', made.id, made.name);
          }}
          role="menuitem"
          type="button"
        >
          <span className="entry-actions-item-label">＋ New category</span>
        </button>
      )}
    </>
  );
}
