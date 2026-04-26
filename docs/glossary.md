# Glossary

Plain-language definitions for technical terms that come up when discussing this project. Grouped by theme, not alphabetized — related concepts sit together so you can read top-to-bottom or jump.

---

## React fundamentals

**Component** — A function that returns UI. In this codebase they live in `src/components/` and are named `PascalCase.jsx` (e.g. `EntryCard.jsx`). Components only render UI; they don't contain logic — that lives in hooks.

**Render / re-render** — React calling the component function to produce UI. "Re-render" means it ran again because some state it depends on changed.

**Mount / unmount** — Mount: the component appears in the UI for the first time. Unmount: React removes it entirely. When a component unmounts, its internal state (e.g. `useState`, `useRef`) is thrown away. This is why `autosave.js` is a plain service, not a hook — if it were a hook, its debounce timer would get thrown out every time the relevant component unmounted.

**Remount** — Unmount followed by mount. Expensive because internal state is lost and setup work usually has to happen again. Part of why the active+reference design is good: swapping sides is a Zustand state flip, not a remount, so nothing tears down.

**Hook** — A function starting with `use` that lets a component use React features (state, effects, context). Custom hooks in this codebase live in `src/hooks/` and are named `use-*.js`. They wrap logic so components stay dumb.

**Props** — Values passed into a component by its parent (like function arguments).

**Synthetic event / event bubbling** — React wraps browser events in its own "synthetic" event objects. "Bubbling" means when you click a button, the click event travels up the DOM tree — the button sees it first, then its parent, then its parent's parent, etc. This is how the hidden-entries popover bug happened: `pointerdown` events bubbled up to `WindowHeader`'s drag handler and got swallowed before they reached the intended click target.

**Portal** — A React feature that lets you render something into a different part of the DOM tree than where it logically sits in your component tree. The popover uses this so it can float above other UI. Bubbling still follows the component tree, not the DOM position — which is why the popover fix needed to stop propagation at the popover root.

---

## State management (Zustand)

**Store** — A central object that holds shared state. This project uses Zustand stores — they live in `src/state/` and each one owns a slice of state. `lorebook-store` owns lorebooks and the active id; `ui-store` owns search/filter/selection; `history-store` owns undo/redo.

**Selector** — A function you give to a store to get a specific field: `useLorebookStore((s) => s.activeLorebookId)`. The component only re-renders when *that field* changes, not when any field in the store changes. Efficient.

**Action** — A function on the store that changes state, like `setActiveLorebookId(id)`. Actions are how you mutate the store.

**Mutation** — Jargon for "changing state." Not React-specific.

**Snapshot** — Capturing the value of something at a moment in time so you can read or compare later without being affected by further changes. `useLorebookStore.getState()` gives you a snapshot of the whole store right now.

**Race / race condition** — When two pieces of code both try to read/write something, and the order they run in changes the result. The d99cec8 fix was preventing a race where `switchLorebook` was mutating store state in the middle of `deleteLorebook` checking other parts of the same store.

**Closure / closure-captured** — In JavaScript, when you define a function inside another function, the inner function "closes over" the outer function's variables — it remembers them even after the outer function has finished. When a React hook calls `useLorebookStore((s) => s.activeLorebookId)`, that value is captured by the hook's closure for that render. Later calls inside the same render read the captured value, not live store state — which is good, because consistency, but matters when you need a *fresh* live read (use `getState()` for that).

**Stale / stale state** — A value that was correct when it was read but isn't anymore because something has changed since. A "stale reference" is a variable still pointing at something that's been deleted or replaced. A "dangling reference" means the same thing.

---

## The architecture layers

**Constants → services → hooks → components** — Imports flow downward. A component can import from hooks; a hook can import from services and stores; a service imports from constants only. Going upward is forbidden (a service can't import a hook; a hook can't import a component).

**Service** — Plain JavaScript (no React) that does one job. `autosave.js` handles writing to localStorage on a delay; `scan-service.js` walks through lorebook data looking for patterns. Services don't know about UI.

**Layer violation** — Importing across the wrong boundary. E.g. a component importing directly from a store instead of going through a hook. CLAUDE.md calls this out explicitly because layer violations create messy dependencies.

**SPA — Single-Page Application** — A web app that's a single HTML page; the JavaScript swaps out content without a full page reload. This project is an SPA.

**Vite** — The build tool for this project. Turns source files (`.jsx`, `.js`, CSS) into the bundled `dist/` output, and runs the dev server with hot reload.

**localStorage** — Browser-provided key/value storage that persists across sessions. This is the entire "database" for this app. `storage-service.js` is the only file allowed to touch it.

**CSS variable** — A custom property in CSS (e.g. `--focus-border`) defined once and referenced throughout. This codebase uses them extensively for theming.

**Hot reload** — Dev-server feature where code changes update the running app without a full page refresh, preserving state. Speeds up iteration.

---

## State-model terminology (this project)

**Slot** — A "place" the UI uses to hold a pointer to a lorebook. The retracted prototype had a left slot and a right slot; single-slot mode only has one "active" slot. The new active+reference design uses `activeLorebookId` (the one you're editing) and `referenceLorebookId` (the read-only one beside it).

**Single-slot vs dual-slot** — Single-slot (the original + current architecture): one lorebook is active at a time, everything else is inert on disk. Dual-slot (the retracted prototype): two lorebooks active simultaneously, both editable. The new design is a hybrid: single-slot editing with a read-only reference view beside it.

**Active + reference** — The new Phase 9 design. "Active" is the normal editor — unchanged from how it's always worked. "Reference" is a read-only view of a different lorebook. Clicking an edit-shaped thing on the reference side *swaps* the two so you can edit that side instead.

**Swap** — Flipping which lorebook is active and which is reference. One Zustand state change, no remount.

**Crosstalk** — Project slang for "two lorebooks side by side" — used for congruency checking, lateral search, find-and-replace across both.

**Autosave clobber** — One autosave run overwriting another's work. Happened in the dual-slot prototype because the autosave service was only writing the focused slot's lorebook, so the other slot's edits never made it to storage.

---

## Version control (git)

**Commit** — A saved snapshot of the codebase at a point in time, with a message. Each commit has a hash (the long random-looking string like `9323707`).

**Branch** — A named line of development. We're on `claude/continue-previous-session-ZvJY6`; commits go on top of it without affecting `main`.

**HEAD** — The commit you're currently sitting on. New commits go on top of HEAD.

**Revert** — A *new* commit that undoes the changes from an earlier commit, added to the top of the branch. Preserves history. Different from reset (destructive).

**Checkout** — Used two ways: (1) switch to a different branch; (2) restore a file to how it looked at a specific commit. In A1 we used form 2: `git checkout 0e14206 -- <files>` pulled those files back to their Polish-Pass-4 state.

**Reset** — Move the branch pointer to a different commit, optionally throwing away the in-between commits. Destructive — can lose work if used carelessly. Avoid unless necessary.

**Merge** — Bringing the changes from one branch into another.

**Bisect** — A debugging tool that helps you find which commit introduced a bug by automatically checking out commits between a known-good and known-bad and asking you to test each one.

**Atomic commit** — A commit that does exactly one conceptually-whole thing. Good atomic commits are easier to review, revert, and bisect.

**Push / pull** — Push: send your local commits to the remote (GitHub). Pull: fetch commits from the remote and bring them into your local branch.

**Stage** — The "waiting to be committed" area. `git add` stages changes; `git commit` takes everything staged and turns it into a commit.

**Diff** — The difference between two versions of the code. Git diffs show what lines were added/removed between commits.

---

## Engineering jargon

**YAGNI — "You Aren't Gonna Need It"** — Don't build things you *think* you'll need later; build them when you actually need them. Reasoning: predictions about the future are usually wrong, and speculative code adds weight (something to maintain, something to understand) without paying rent.

**Noop / no-op** — "No operation." Code that doesn't do anything, or a task that turns out to require no actual changes (like A2).

**Defensive programming** — Writing code to guard against situations that shouldn't happen but might. E.g. checking if a value is null even when you "know" it can't be. Trade-off: safer, but noisier; good at system boundaries, bad when overused internally.

**Dead code** — Code that exists but isn't reached or used. Should be deleted.

**Idempotent** — An operation you can run multiple times and get the same result. `setActiveLorebookId(x)` is idempotent; `incrementCounter()` isn't.

**Regression** — A bug introduced while fixing or building something else — something that used to work and now doesn't.

**Refactor** — Changing the shape of code without changing what it does. Renaming, splitting, consolidating.

**Shim / polyfill** — A small piece of code that fills a gap, usually for compatibility. CLAUDE.md warns against "backwards-compatibility shims" — don't pretend old data shapes still exist if you can just migrate the data.

**Feature flag / gate** — A conditional that turns a feature on or off. The crosstalk reference panel is gated by the `crosstalkEnabled` setting (Settings → "Show reference panel"); during Phase 9 development it lived behind a `?crosstalk=1` URL parameter that's since been removed.

**Surface / widening surface** — The set of places in the codebase you'd need to change to accomplish something. "Widening surface" = a change that ended up touching more files than expected, usually a sign that the original design didn't anticipate it.

**Cascade** — One fix exposing another problem, whose fix exposes another, etc. The dual-slot prototype hit a cascade: autosave clobber fix → delete-cleanup bug → lorebook-creation displacement → etc.

**Root cause** — The real underlying reason something is broken, as opposed to its symptom. CLAUDE.md says: fix root causes, don't just silence symptoms.

---

## Debouncing / throttling

**Debounce** — Wait for quiet. "Run this function, but only *after* no one has asked to run it for 500ms." Autosave uses this — rapid typing doesn't save on every keystroke, just after you stop.

**Throttle** — Run at most this often. "Run this function, but at most once every 500ms."

---

## How to use this doc

When I use a term you don't recognize, ask — and I'll add it here if it's worth knowing. This is meant to grow with our conversations, not be comprehensive on day one.
