// Default shapes for new entries, lorebook, settings, and window size/position
import { DEFAULT_TYPE } from './entry-types.js';
import { CHAR_WARN_YELLOW, CHAR_WARN_RED } from './limits.js';

export const DEFAULT_WINDOW = { width: 760, height: 620, x: 60, y: 40 };
export const DEFAULT_WINDOW_FRACTION = 2 / 3;

export const DEFAULT_SETTINGS = {
  counterTiers:             { yellow: CHAR_WARN_YELLOW, red: CHAR_WARN_RED },
  defaultWindowWidth:       DEFAULT_WINDOW.width,
  defaultWindowHeight:      DEFAULT_WINDOW.height,
  tieredCounterEnabled:     true,
  hideSuggestionsByDefault: false,
  hideEntryStats:           false,
  newEntryHotkey:           'n',
  // 6 hotbar slots: 3 left of FAB, 3 right. null = empty slot.
  hotbarSlots:              ['undo', 'redo', 'clear_entries', 'append_import', null, null],
  // Entry type selector style in the mobile detail panel
  entryTypeView:            'dropdown',  // 'dropdown' | 'buttons'
  // FAB (+ button) size
  fabSize:                  'large',     // 'small' | 'medium' | 'large' | 'custom'
  fabCustomSize:            60,          // px, used only when fabSize === 'custom'
};

export const DEFAULT_ENTRY = {
  id:          '',
  name:        '',
  type:        DEFAULT_TYPE,
  triggers:    [],
  description: '',
};

export const DEFAULT_LOREBOOK = {
  id:      '',
  name:    'New Lorebook',
  entries: [],
};

export const TEMPLATE_LOREBOOK = {
  id:   'template',
  name: 'Template Lorebook',
  entries: [
    {
      id:          'tpl-1',
      name:        'Character Name',
      type:        'character',
      triggers:    ['name', 'nickname', 'alias'],
      description: 'Enter a description of this character here.',
    },
    {
      id:          'tpl-2',
      name:        'Location Name',
      type:        'location',
      triggers:    ['place', 'location name'],
      description: 'Describe this location here.',
    },
  ],
};
