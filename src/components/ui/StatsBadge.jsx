// Combined trigger count and character count badge shown in the entry card header
export function StatsBadge({ triggerCount, charCount }) {
  return (
    <span className="stats-badge">
      {triggerCount} {triggerCount === 1 ? 'trigger' : 'triggers'} · {charCount} chars
    </span>
  );
}
