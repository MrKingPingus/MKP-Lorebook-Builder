// Tiered color-coded character count display: green (safe), yellow (warning), red (over limit)
export function CharCounter({ count, tiers }) {
  const { yellow = 400, red = 600 } = tiers ?? {};
  const color = count >= red ? 'var(--red)' : count >= yellow ? 'var(--yellow)' : 'var(--green)';
  return (
    <span className="char-counter" style={{ color }}>
      {count}
    </span>
  );
}
