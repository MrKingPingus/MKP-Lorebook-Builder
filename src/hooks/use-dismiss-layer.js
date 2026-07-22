// Register a dismissable layer into the Escape priority stack while it is
// active. On Escape the highest-priority registered layer's onDismiss runs;
// lower layers stay put. Unregisters on unmount or when `active` goes false.
import { useEffect, useRef } from 'react';
import {
  registerDismissLayer,
  unregisterDismissLayer,
} from '../services/dismiss-stack.js';

export function useDismissLayer(id, active, priority, onDismiss) {
  // Keep the latest handler without forcing a re-register every render.
  const handlerRef = useRef(onDismiss);
  handlerRef.current = onDismiss;

  useEffect(() => {
    if (!active) return undefined;
    registerDismissLayer(id, priority, () => handlerRef.current?.());
    return () => unregisterDismissLayer(id);
  }, [id, active, priority]);
}
