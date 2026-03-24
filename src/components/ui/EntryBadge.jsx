// Entry enum number badge displaying the entry's position in the list (e.g. "#1 – Name")
export function EntryBadge({ index, name }) {
  const label = name ? `#${index + 1} – ${name}` : `#${index + 1}`;
  return <span className="entry-badge">{label}</span>;
}
