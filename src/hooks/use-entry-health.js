// Hook wrapping entry-health.js — supplies counterTiers from settings automatically.
import { useSettings }    from './use-settings.js';
import { evaluateEntry }  from '../services/entry-health.js';

export function useEntryHealth(entry) {
  const { counterTiers } = useSettings();
  return evaluateEntry(entry, { counterTiers });
}
