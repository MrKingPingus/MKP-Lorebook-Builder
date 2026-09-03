// Entry Templates (Phase 12, GitHub #114) — pure shape and application logic.
//
// A template is a saved entry scaffold, stored globally, loaded into either the
// entry you have open or a brand-new one. Nothing here touches storage, stores
// or React: it takes a template and an entry in, and hands new objects back.
//
// **The load checklist is content-driven, not configured** (locked decision 3).
// There is deliberately no field menu at SAVE time — the payload is always the
// whole entry, and a user who doesn't want a title on a template just leaves
// the source entry's title blank. The checklist at LOAD time then lists only
// the fields that actually carry something, so a description-only scaffold has
// nothing to tick and loads straight in. Saving stays a one-press action, and
// the one decision that survives is asked at the moment it matters.
import { uid } from './entry-factory.js';
import {
  TEMPLATE_FIELD_IDS,
  DESCRIPTION_APPEND,
  TEMPLATE_NAME_LIMIT,
} from '../constants/templates.js';

/** Does this field carry anything worth loading? Empty strings, whitespace and
 *  empty trigger arrays all read as absent — which is what makes the checklist
 *  content-driven rather than a list of four boxes that are mostly empty. */
export function fieldHasContent(payload, field) {
  const value = payload?.[field];
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim().length > 0;
}

/** The fields this template can actually contribute, in checklist order. */
export function contentFields(template) {
  return TEMPLATE_FIELD_IDS.filter((f) => fieldHasContent(template?.payload, f));
}

/** A description-only template has nothing to choose between, so the load skips
 *  the checklist entirely (locked decision 3). */
export function needsChecklist(template) {
  const fields = contentFields(template);
  return !(fields.length === 1 && fields[0] === 'description');
}

/**
 * Capture an entry as a template. The payload is a snapshot, not a reference:
 * triggers are copied so editing the source entry afterwards cannot rewrite a
 * template that was already saved.
 */
export function templateFromEntry(entry, { name, categoryId = null } = {}) {
  if (!entry) return null;
  const now = Date.now();
  const label = (name ?? entry.name ?? '').trim();
  return {
    id:         uid(),
    name:       (label || 'Untitled template').slice(0, TEMPLATE_NAME_LIMIT),
    categoryId,
    createdAt:  now,
    updatedAt:  now,
    payload: {
      name:        entry.name ?? '',
      type:        entry.type ?? '',
      triggers:    [...(entry.triggers ?? [])],
      description: entry.description ?? '',
    },
  };
}

/**
 * The patch a template makes to an entry.
 *
 * @param fields             which of the template's content fields to apply
 * @param descriptionMode    what to do when the entry ALREADY has a
 *                           description (locked decision 4) — overwrite it, or
 *                           append the template's text after it. Ignored when
 *                           the entry's description is empty, which is the case
 *                           the prompt must not appear for.
 * @returns a patch object, or null when nothing would change — so a caller can
 *          skip the write and the undo step in one check.
 */
export function applyTemplate(template, entry, { fields, descriptionMode } = {}) {
  if (!template || !entry) return null;
  const wanted = new Set(fields ?? contentFields(template));
  const patch  = {};

  for (const field of TEMPLATE_FIELD_IDS) {
    if (!wanted.has(field)) continue;
    if (!fieldHasContent(template.payload, field)) continue;
    const value = template.payload[field];

    if (field === 'triggers') {
      // Union rather than replace: triggers are additive by nature, and a
      // scaffold like `name / alias / nickname` is meant to extend what is
      // there. Case-insensitive, because the trigger list treats them that way.
      const have = new Set((entry.triggers ?? []).map((t) => t.toLowerCase()));
      const added = value.filter((t) => !have.has(String(t).toLowerCase()));
      if (added.length === 0) continue;
      patch.triggers = [...(entry.triggers ?? []), ...added];
      continue;
    }

    if (field === 'description' && String(entry.description ?? '').trim() !== '') {
      if (descriptionMode === DESCRIPTION_APPEND) {
        patch.description = `${entry.description}\n\n${value}`;
      } else {
        patch.description = value;
      }
      continue;
    }

    patch[field] = value;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

/** Would filling `entry` from `template` land on top of existing description
 *  text? The only condition under which the overwrite/append prompt appears. */
export function descriptionWouldCollide(template, entry, fields) {
  const wanted = new Set(fields ?? contentFields(template));
  if (!wanted.has('description')) return false;
  if (!fieldHasContent(template?.payload, 'description')) return false;
  return String(entry?.description ?? '').trim() !== '';
}

/** Templates belonging to a category (null = uncategorized), newest first. */
export function templatesInCategory(templates, categoryId) {
  return (templates ?? [])
    .filter((t) => (t.categoryId ?? null) === (categoryId ?? null))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

/** A one-line preview for a template's hover card (locked decision 7). */
export function templatePreview(template, maxChars = 180) {
  const text = String(template?.payload?.description ?? '').trim();
  if (!text) return '';
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1)}…`;
}
