// Pre-flight validation against CharSnap's limits, mirroring what the host
// checks before it writes. Running it here first means the common failures
// are caught with the offending entry on screen and nothing posted; the
// host's own `mkp:save-rejected` remains the backstop.
//
// Returns the same shape the host sends: `[{ index, field, message }]`, with
// `index: -1` for lorebook-level problems. Empty array means valid.
import { ENTRY_TYPES } from '../constants/entry-types.js';
import { HOST_LIMITS } from '../constants/host.js';

const VALID_TYPES = new Set(ENTRY_TYPES.map((t) => t.id));

export function validateForHost(lorebook) {
  const errors = [];
  const push = (index, field, message) => errors.push({ index, field, message });

  const name = typeof lorebook?.name === 'string' ? lorebook.name.trim() : '';
  if (name.length === 0) push(-1, 'name', 'The lorebook needs a name');
  else if (name.length > HOST_LIMITS.lorebookName) push(-1, 'name', `Lorebook name is over ${HOST_LIMITS.lorebookName} characters`);

  (lorebook?.entries ?? []).forEach((e, index) => {
    const entryName = typeof e?.name === 'string' ? e.name.trim() : '';
    if (entryName.length === 0) push(index, 'name', 'Entry name is required');
    else if (entryName.length > HOST_LIMITS.name) push(index, 'name', `Entry name is over ${HOST_LIMITS.name} characters`);

    const triggers = Array.isArray(e?.triggers) ? e.triggers : [];
    if (triggers.length === 0) push(index, 'triggers', 'At least one trigger is required');
    else if (triggers.length > HOST_LIMITS.triggers) push(index, 'triggers', `More than ${HOST_LIMITS.triggers} triggers`);
    else if (triggers.some((t) => typeof t !== 'string' || t.trim().length === 0)) push(index, 'triggers', 'A trigger is blank');

    const description = typeof e?.description === 'string' ? e.description : '';
    if (description.trim().length === 0) push(index, 'description', 'Description is required');
    else if (description.length > HOST_LIMITS.description) push(index, 'description', `Description is over ${HOST_LIMITS.description} characters`);

    if (!VALID_TYPES.has(e?.type)) push(index, 'entryType', 'Unknown entry type');
  });

  return errors;
}
