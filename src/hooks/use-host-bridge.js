// Thin React seam over services/host-bridge.js: one subscription for the life
// of the app, a `post(type, fields)` that always names its target origin, and
// origin locking — the first valid inbound message fixes which allowlisted
// origin the host is, and everything after goes there alone.
//
// Message *meaning* lives in use-host.js. This hook only moves envelopes.
import { useEffect, useRef, useCallback } from 'react';
import { useHostStore } from '../state/host-store.js';
import { resolveHostOrigin, postToHost, subscribeToHost } from '../services/host-bridge.js';

export function useHostBridge(onMessage) {
  const enabled    = useHostStore((s) => s.enabled);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  // `type` is placed last so a caller cannot accidentally overwrite it through
  // `fields`. Returns false when not embedded, which lets callers stay unaware
  // of host mode entirely.
  const post = useCallback((type, fields = {}) => {
    const { enabled: on, hostOrigin } = useHostStore.getState();
    if (!on) return false;
    return postToHost({ ...fields, type }, hostOrigin);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const store = useHostStore.getState();
    if (!store.hostOrigin) {
      const guess = resolveHostOrigin();
      if (guess) store.setHostOrigin(guess);
    }
    return subscribeToHost(
      (data, origin) => handlerRef.current?.(data, origin),
      {
        getOrigin: () => useHostStore.getState().hostOrigin,
        onOrigin:  (origin) => useHostStore.getState().setHostOrigin(origin),
      },
    );
  }, [enabled]);

  return { post };
}
