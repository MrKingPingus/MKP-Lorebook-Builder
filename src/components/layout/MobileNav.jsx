// Sticky bottom navigation bar — rendered only on mobile, replaces inline header tabs
import { useUiStore } from '../../state/ui-store.js';

const TABS = [
  { id: 'build',         label: 'Build' },
  { id: 'import-export', label: 'Import / Export' },
  { id: 'settings',      label: 'Settings' },
];

export function MobileNav() {
  const activeTab    = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);

  return (
    <nav className="mobile-nav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`mobile-nav-tab${activeTab === tab.id ? ' mobile-nav-tab--active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
