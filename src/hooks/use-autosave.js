// Mount and unmount the autosave service as a React effect — wires the service lifecycle to App
import { useEffect } from 'react';
import { mountAutosave } from '../services/autosave.js';

export function useAutosave() {
  useEffect(() => {
    const unmount = mountAutosave();
    return unmount;
  }, []);
}
