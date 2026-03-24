// Window footer — renders "Alt+N — new entry" hint text and the Add Entry FAB
import { FAB } from '../ui/FAB.jsx';
import { useEntries } from '../../hooks/use-entries.js';

export function WindowFooter() {
  const { addEntry } = useEntries();

  return (
    <div className="window-footer">
      <span className="footer-hint">Alt+N — new entry</span>
      <FAB onClick={addEntry} />
    </div>
  );
}
