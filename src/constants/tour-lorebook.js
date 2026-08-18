// The lorebooks the feature tour runs on.
//
// The tour drives the real app, so it needs a real book to drive it against.
// Three things ruled out the alternatives:
//
// - **Not the user's book.** Several steps have genuine side effects — the
//   reference step *pairs* a book — and "the tour paired a reference lorebook I
//   didn't ask for" is a bad first five minutes.
// - **Not `verify/fixtures/`.** Those are the author's own lorebooks. They are
//   right for tests and wrong to ship to strangers.
// - **A set, not a book.** The reference step needs a second book to offer, and
//   the title-menu step wants a list with more than one row in it.
//
// Arthurian, from the public domain, chosen for *instant legibility* rather
// than for novelty. A first pass reached for the Kalevala on the strength of
// being maximally unlike LLM stock naming, which optimised the constraint past
// the point of the job: someone puzzling over an unfamiliar name has stopped
// looking at the entry card they were supposed to be learning.
//
// This file is app data, not test data, so it lives in `src/` and ships in the
// bundle. `use-tour.js` reaches it through a dynamic `import()` so it costs
// nothing to the majority who never open the tour.
//
// **The names are short on purpose, and that is a trade.** They were originally
// "Camelot (tour sample)" and similar, so a copy surviving a mid-tour tab close
// would read as obviously disposable. But the mobile title field is 214px wide,
// so that truncated to "Camelot (tour sam…" — in the step whose entire subject
// *is* the lorebook title. A certain cost to every tour beat a hypothetical cost
// to the one user who closes the tab mid-way, so the names got shorter.
//
// `use-tour.js` deletes both books on Done, Skip and Escape. The only leak is a
// tab closed mid-tour, which leaves two ordinary-looking books the user can
// delete. Cleaning that up needs the created ids recorded outside the session;
// noted as a follow-up rather than built, because it costs a storage key.

// Only the fields that carry meaning. Everything else — id, lastModified, the
// export and folder flags — is filled in by `createEmptyEntry` when `use-tour.js`
// loads the set. Ids in particular *must* be minted at load rather than written
// here: the tour can be taken twice in a session, and two books of entries
// sharing ids is a bug looking for somewhere to happen.
const entry = (name, type, triggers, description) => ({ name, type, triggers, description });

// Descriptions are a sentence or two — long enough that the character readout
// on each card shows a plausible number rather than a suspicious 40/1500, short
// enough that nobody feels invited to read them during a tour about buttons.
export const TOUR_MAIN_BOOK = {
  name: 'Camelot',
  entries: [
    entry('King Arthur', 'character', ['arthur', 'the king', 'pendragon'],
      'The king who drew the sword from the stone and gathered the knights of the Round Table at Camelot. Fair in judgement and slow to suspect those closest to him.'),
    entry('Merlin', 'character', ['merlin', 'the wizard'],
      'Adviser to the king and the architect of his rise. Speaks in prophecy more often than in plain answers, which those around him find less charming than he does.'),
    entry('Guinevere', 'character', ['guinevere', 'the queen'],
      'Queen at Camelot, and the still point around which most of the court\'s quieter troubles turn.'),
    entry('Morgan le Fay', 'character', ['morgan', 'le fay', 'morgana'],
      'Enchantress and the king\'s half-sister. Her opposition is personal rather than political, which makes it harder to negotiate with.'),
    entry('Sir Lancelot', 'character', ['lancelot', 'du lac'],
      'The finest knight of the Round Table by common agreement, including his own, and the one whose loyalties are most often tested.'),
    entry('Camelot', 'location', ['camelot', 'the castle', 'the court'],
      'The king\'s seat: a walled city around a hall built to hold the Round Table. Prosperous, well defended, and rather too full of people watching each other.'),
    entry('Avalon', 'location', ['avalon', 'the isle'],
      'An island reached by water and rarely by intention. Where Excalibur was made and where the wounded king is carried at the end.'),
    entry('Excalibur', 'item', ['excalibur', 'the sword'],
      'The king\'s sword, given by the Lady of the Lake. Its scabbard is the more valuable half, a fact almost everyone forgets.'),
    entry('The Round Table', 'item', ['round table', 'the table'],
      'Seats a hundred and fifty knights with no head and no foot, so that no one at it outranks anyone else by where they sit.'),
    entry('The Sword in the Stone', 'plot_event', ['sword in the stone', 'the stone'],
      'The proof of the king\'s claim: an anvil-set blade no one else could move. Witnessed by enough of the wrong people to make denying it difficult.'),
    entry('The Quest for the Grail', 'plot_event', ['grail', 'the quest', 'holy grail'],
      'The search that empties the Round Table of its best knights and returns most of them changed, fewer of them alive, and none of them satisfied.'),
    entry('The Knights of the Round Table', 'other', ['knights', 'the order', 'round table knights'],
      'The order itself: its oath, its ranks, and the standing it confers at court. Membership is granted by the king and surrendered only in disgrace.'),
  ],
};

// Deliberately a different *kind* of book, so the reference-pairing step reads
// as pairing rather than as duplicating. A style book is also the clearest
// honest example of what a reference lorebook is for.
export const TOUR_REFERENCE_BOOK = {
  name: 'Style Notes',
  entries: [
    entry('Forms of Address', 'other', ['address', 'titles', 'my lord'],
      'Knights are "Sir" and never "Lord". The king is "my lord" in speech and "the king" in narration.'),
    entry('Naming Conventions', 'other', ['naming', 'spelling'],
      'Prefer the familiar spellings — Guinevere over Gwenhwyfar, Morgan over Morgen — so a reader is never slowed down by orthography.'),
    entry('Tone', 'other', ['tone', 'register', 'voice'],
      'Plain and unhurried. The material is grand enough without help from the prose.'),
  ],
};
