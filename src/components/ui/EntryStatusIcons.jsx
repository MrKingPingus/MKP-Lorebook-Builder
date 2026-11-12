// Entry status badges for card headers: public / private, hidden from
// export, always on, trigger condition. Shared by the entry card and the
// reference panel's cards, so the two show the same marks for the same state.

// Header status badges. CharSnap entries default to private, so Public is the
// exception worth flagging — an open eye = "made Public". Hidden-from-Export
// gets an export/upload glyph crossed out, a distinct metaphor from the eye.
export function PublicEyeIcon() {
  return (
    <span className="entry-public-icon" title="Public on CharSnap" aria-label="Public">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </span>
  );
}

export function PrivateEyeOffIcon() {
  return (
    <span className="entry-private-icon" title="Private on CharSnap" aria-label="Private">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    </span>
  );
}

// Always-on: a small filled circle "always lit". A trigger condition gets a
// speech-bubble-with-check glyph — "fires when the chat says so".
export function AlwaysOnIcon() {
  return (
    <span className="entry-always-on-icon" title="Sent every turn on CharSnap (always on)" aria-label="Always on">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <circle cx="12" cy="12" r="3" fill="currentColor"/>
      </svg>
    </span>
  );
}

// With `onClick` it is a button: pressing it opens the entry and highlights
// the Trigger condition field, which is the quickest answer to "what is this
// icon". Without one (the phone card, where a tap opens the editor anyway) it
// stays a plain badge.
export function ConditionIcon({ onClick }) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      className={`entry-condition-icon${onClick ? ' entry-condition-icon--btn' : ''}`}
      title={onClick
        ? 'Has a trigger condition: CharSnap judges it against the chat each turn. Click to show it.'
        : 'Has a trigger condition (judged against the chat each turn on CharSnap)'}
      aria-label={onClick ? 'Show this entry\'s trigger condition' : 'Trigger condition'}
      {...(onClick ? { type: 'button', onClick } : {})}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <polyline points="9 10 11 12 15 8"/>
      </svg>
    </Tag>
  );
}

export function ExportOffIcon() {
  return (
    <span className="entry-hidden-icon" title="Entry excluded from JSON export" aria-label="Hidden from export">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="16 6 12 2 8 6"/>
        <line x1="12" y1="2" x2="12" y2="15"/>
        <line x1="3" y1="3" x2="21" y2="21"/>
      </svg>
    </span>
  );
}

/** The full set for one entry, in the order the entry card shows them. */
export function EntryStatusIcons({ entry, markPrivateEntries = false, onConditionClick }) {
  return (
    <>
      {entry.isPublic === true && <PublicEyeIcon />}
      {entry.isPublic !== true && markPrivateEntries && <PrivateEyeOffIcon />}
      {entry.hiddenFromExport && <ExportOffIcon />}
      {entry.alwaysOn === true && <AlwaysOnIcon />}
      {(entry.triggerCondition ?? '').trim() !== '' && <ConditionIcon onClick={onConditionClick} />}
    </>
  );
}
