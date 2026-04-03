// Find and Replace fields — rendered inside SearchBar's single row; receives state as props
export function FindReplace({ findText, setFindText, replaceText, setReplaceText, matchCount, replaceAll }) {
  return (
    <>
      <input
        className="find-input"
        value={findText}
        onChange={(e) => setFindText(e.target.value)}
        placeholder="Find…"
      />
      <input
        className="replace-input"
        value={replaceText}
        onChange={(e) => setReplaceText(e.target.value)}
        placeholder="Replace with…"
      />
      <button
        className="replace-all-btn"
        onClick={replaceAll}
        disabled={!findText || matchCount === 0}
      >
        Replace all ({matchCount})
      </button>
    </>
  );
}
