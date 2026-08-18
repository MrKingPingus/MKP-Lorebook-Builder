// Priority-ordered registry of dismissable UI layers. Escape pops the single
// highest-priority active layer (a popover before the select mode beneath it,
// etc.) instead of firing every open layer's handler at once. Plain module —
// components register via the use-dismiss-layer hook; the keyboard dispatcher
// calls dismissTopLayer().

const layers = new Map(); // id -> { priority, onDismiss }

// Standard priorities (higher wins). Keep app-level modes here so ordering is
// declared in one place.
export const DISMISS_PRIORITY = {
  popover:            100,
  modal:               90,
  navAwayPrompt:       80,
  findReplace:         60,
  compare:             50,
  pickFromReference:   45,
  select:              40,
  // The mobile entry editor is a destination rather than a layer — it is the
  // whole screen and anything else that opens sits on top of it — so it must
  // lose to every popover and sheet above it, and still beat the lander.
  entryDetail:         20,
  lander:              10,
  // The guided tour paints above everything and must be dismissed *last* —
  // paint order and dismiss order are deliberately opposite here. Escape during
  // the tour should close the title menu the tour just opened and leave the tour
  // standing; at any higher priority it closes the tour and leaves the menu.
  tour:                 5,
};

export function registerDismissLayer(id, priority, onDismiss) {
  layers.set(id, { priority, onDismiss });
}

export function unregisterDismissLayer(id) {
  layers.delete(id);
}

/** Dismiss the highest-priority active layer. Returns true if one was popped. */
export function dismissTopLayer() {
  let top = null;
  for (const [id, layer] of layers) {
    if (!top || layer.priority > top.priority) top = { id, ...layer };
  }
  if (!top) return false;
  top.onDismiss();
  return true;
}

// Test/inspection aid — not used in app code.
export function activeDismissLayerCount() {
  return layers.size;
}
