// Entry Templates (Phase 12, GitHub #114) — vocabulary and limits.
//
// Templates are **global**: they live under one localStorage key of their own
// rather than inside a lorebook, because the whole point is reusing a scaffold
// across books (locked decision 6).
import { FOLDER_COLORS } from './folders.js';

/** The fields a template carries, in the order the load checklist lists them.
 *
 *  Locked decision 1 is "the payload is the whole entry, always — a user who
 *  doesn't want a title or triggers just leaves them off the source entry".
 *  That rationale is about CONTENT you could choose not to write, which is what
 *  these four are. `isPublic` and `hiddenFromExport` are deliberately NOT here:
 *  they are per-entry publishing state with no "leave it off" position, and a
 *  template that silently marked an entry hidden-from-export would be a nasty
 *  thing to discover at export time. `folderId` and `snapshots` are excluded
 *  for the reasons `cloneEntry` excludes them.
 */
export const TEMPLATE_FIELDS = [
  { id: 'name',        label: 'Title' },
  { id: 'type',        label: 'Type' },
  { id: 'triggers',    label: 'Triggers' },
  { id: 'description', label: 'Description' },
  // The two below are captured only when their option is on (see
  // TEMPLATE_OPTIONAL_FIELDS). A template saved with one offers it in the load
  // checklist like any other field, whatever the option says later.
  { id: 'triggerCondition', label: 'Trigger condition' },
  { id: 'alwaysOn',         label: 'Always on' },
];

/** Fields a template leaves out unless the user has opted in, with the setting
 *  that opts in. Both are CharSnap behaviour that tends to belong to one entry,
 *  which is why off is the default and the choice is the user's. */
export const TEMPLATE_OPTIONAL_FIELDS = [
  { id: 'triggerCondition', setting: 'templateSaveCondition', label: 'Save the trigger condition in new templates' },
  { id: 'alwaysOn',         setting: 'templateSaveAlwaysOn',  label: 'Save Always on in new templates' },
];

export const TEMPLATE_FIELD_IDS = TEMPLATE_FIELDS.map((f) => f.id);

/** How a fill resolves a description that already has text (locked decision 4). */
export const DESCRIPTION_OVERWRITE = 'overwrite';
export const DESCRIPTION_APPEND    = 'append';

/** Template categories reuse the folder swatches — they are the same kind of
 *  organisational tag, and two palettes for one idea would be noise. */
export const TEMPLATE_CATEGORY_COLORS = FOLDER_COLORS;

export const NEW_TEMPLATE_CATEGORY_NAME = 'New Category';
export const UNCATEGORIZED_LABEL        = 'Uncategorized';
export const TEMPLATES_ROOT_LABEL       = 'Templates';

/** Categories nest, and the drill-in dropdown shows one level at a time with a
 *  breadcrumb — so the folder tree's 21px-of-indent reason for capping at 3
 *  doesn't apply. Capped anyway: a breadcrumb long enough to wrap is its own
 *  kind of unusable, and nobody has more scaffolds than this can hold. */
export const MAX_TEMPLATE_CATEGORY_DEPTH = 4;

export const MAX_TEMPLATES = 200;
export const TEMPLATE_NAME_LIMIT = 60;
