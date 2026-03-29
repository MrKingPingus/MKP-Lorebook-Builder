// Thin hook wrapping ui-store — components import this instead of the store directly
import { useUiStore } from '../state/ui-store.js';

export { useUiStore as useUi };
