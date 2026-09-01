// Entry Templates (Phase 12, GitHub #114) — the store, persistence, and the two
// load actions.
//
// **Every mutation writes through immediately.** Templates have no autosave:
// autosave persists the active lorebook and nothing else, and templates are not
// in a lorebook at all. So each action here saves in the same breath it mutates
// — the same rule cross-book transfers had to adopt in `use-entry-transfer.js`.
//
// **Filling an entry is one undo step.** `updateEntry(..., discrete: true)`
// pushes a history snapshot before the patch lands, so a template dropped onto
// the wrong entry is one Ctrl+Z away — which is what lets the load actions be
// as unceremonious as they are.
import { useTemplatesStore } from '../state/templates-store.js';
import { useEntries }        from './use-entries.js';
import { readJson, writeJson } from '../services/storage-service.js';
import { TEMPLATES_KEY }       from '../constants/storage-keys.js';
import {
  templateFromEntry, applyTemplate, contentFields, needsChecklist,
  descriptionWouldCollide, templatesInCategory, templatePreview,
} from '../services/template-service.js';
import * as tree from '../services/category-tree.js';
import {
  TEMPLATE_CATEGORY_COLORS, NEW_TEMPLATE_CATEGORY_NAME,
  MAX_TEMPLATE_CATEGORY_DEPTH, MAX_TEMPLATES,
} from '../constants/templates.js';

/** Read the stored blob. Exported so App.jsx can hydrate at boot without
 *  reaching for storage-service itself. */
export function loadStoredTemplates() {
  const raw = readJson(TEMPLATES_KEY, null);
  return {
    templates:  Array.isArray(raw?.templates)  ? raw.templates  : [],
    categories: Array.isArray(raw?.categories) ? raw.categories : [],
  };
}

export function useTemplates() {
  const templates  = useTemplatesStore((s) => s.templates);
  const categories = useTemplatesStore((s) => s.categories);
  const { entries, addEntry, updateEntry } = useEntries();

  /** Persist whatever the store holds right now. Read from getState() rather
   *  than the hook closure so a chained mutation (add a category, then file a
   *  template into it) saves the post-chain state, not the pre-chain one. */
  function persist() {
    const { templates: t, categories: c } = useTemplatesStore.getState();
    writeJson(TEMPLATES_KEY, { templates: t, categories: c });
  }

  const atCapacity = templates.length >= MAX_TEMPLATES;

  // ── saving ────────────────────────────────────────────────────────────────
  function saveEntryAsTemplate(entry, { name, categoryId = null } = {}) {
    if (!entry || atCapacity) return null;
    const template = templateFromEntry(entry, { name, categoryId });
    if (!template) return null;
    useTemplatesStore.getState().addTemplate(template);
    persist();
    return template;
  }

  function renameTemplate(id, name) {
    useTemplatesStore.getState().updateTemplate(id, { name });
    persist();
  }

  function moveTemplateToCategory(id, categoryId) {
    useTemplatesStore.getState().updateTemplate(id, { categoryId: categoryId ?? null });
    persist();
  }

  function deleteTemplate(id) {
    useTemplatesStore.getState().removeTemplate(id);
    persist();
  }

  /** Re-capture an existing template from an entry, keeping its name, category
   *  and place in the list — the same "overwrite this one" shape checkpoints
   *  grew, and for the same reason: a scaffold you refine is one thing, not a
   *  growing pile of near-identical saves. */
  function overwriteTemplate(id, entry) {
    const fresh = templateFromEntry(entry, { name: 'x' });
    if (!fresh) return;
    useTemplatesStore.getState().updateTemplate(id, { payload: fresh.payload });
    persist();
  }

  // ── loading ───────────────────────────────────────────────────────────────
  /** Fill the entry you have open. Returns true if anything changed. */
  function fillEntryFromTemplate(entryId, template, { fields, descriptionMode } = {}) {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return false;
    const patch = applyTemplate(template, entry, { fields, descriptionMode });
    if (!patch) return false;
    updateEntry(entryId, patch, true); // discrete → one undo step
    return true;
  }

  /** Create a new entry and fill it. A fresh entry has no description, so the
   *  overwrite/append question cannot arise here — only `fields` applies. */
  function createEntryFromTemplate(template, { fields } = {}) {
    const created = addEntry();
    if (!created) return null;
    const patch = applyTemplate(template, created, { fields });
    if (patch) updateEntry(created.id, patch);
    return created;
  }

  // ── categories ────────────────────────────────────────────────────────────
  function createCategory({ parentId = null, name } = {}) {
    const node = tree.createNode(categories, {
      name:      name ?? NEW_TEMPLATE_CATEGORY_NAME,
      colors:    TEMPLATE_CATEGORY_COLORS,
      overrides: { parentId },
    });
    useTemplatesStore.getState().setCategories([...categories, node]);
    persist();
    return node;
  }

  function updateCategory(id, patch) {
    useTemplatesStore.getState().setCategories(tree.updateNode(categories, id, patch));
    persist();
  }

  function deleteCategory(id) {
    // `removeNode` re-homes children onto the deleted node's own parent, and
    // the store re-homes its templates to uncategorized. Deleting a middle
    // level collapses the tree; it never deletes what was inside it.
    useTemplatesStore.getState().removeCategory(id, tree.removeNode(categories, id));
    persist();
  }

  function moveCategory(id, parentId) {
    if (!tree.canNest(categories, id, parentId, MAX_TEMPLATE_CATEGORY_DEPTH)) return false;
    updateCategory(id, { parentId: parentId ?? null });
    return true;
  }

  return {
    templates,
    categories,
    atCapacity,
    // reads
    childCategories: (parentId) => tree.childrenOf(categories, parentId),
    categoryPath:    (id) => tree.pathTo(categories, id),
    inCategory:      (id) => templatesInCategory(templates, id),
    contentFields,
    needsChecklist,
    descriptionWouldCollide,
    templatePreview,
    // writes
    saveEntryAsTemplate, overwriteTemplate, renameTemplate,
    moveTemplateToCategory, deleteTemplate,
    fillEntryFromTemplate, createEntryFromTemplate,
    createCategory, updateCategory, deleteCategory, moveCategory,
  };
}
