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
