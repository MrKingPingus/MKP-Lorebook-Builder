// Press-twice confirmation for a destructive one-shot button.
//
// It replaces `window.confirm()`, which a sandboxed frame without
// `allow-modals` (the claude.ai test build, and possibly CharSnap's iframe)
// refuses without showing anything. `confirm()` then answers *no*, so the
// button silently did nothing there. Moves had the same bug; their fix asks
// inline in the panel, which a single button has no room for. So the button
// asks for itself: the first press arms it and swaps in a confirm label, a
// second press inside the window acts, and anything else lets it lapse.
//
// One instance can serve several buttons (the + menu's chips): `armedId` says
// which one is armed, and arming another disarms the first.
import { useState, useRef, useEffect, useCallback } from 'react';
import { CONFIRM_PRESS_WINDOW_MS } from '../constants/limits.js';

export function useConfirmPress() {
  const [armedId, setArmedId] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const disarm = useCallback(() => {
    clearTimeout(timer.current);
    setArmedId(null);
  }, []);

  /**
   * @param id            which button was pressed
   * @param needsConfirm  false runs `run` straight away
   * @param run           the action
   */
  const press = useCallback((id, needsConfirm, run) => {
    clearTimeout(timer.current);
    if (!needsConfirm || armedId === id) {
      setArmedId(null);
      run();
      return;
    }
    setArmedId(id);
    timer.current = setTimeout(() => setArmedId(null), CONFIRM_PRESS_WINDOW_MS);
  }, [armedId]);

  return { armedId, press, disarm };
}
