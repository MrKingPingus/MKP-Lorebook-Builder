// Floating action button for creating a new lorebook entry — positioned in the window footer
export function FAB({ onClick }) {
  return (
    <button className="fab" onClick={onClick} title="Add entry (Alt+N)">
      +
    </button>
  );
}
