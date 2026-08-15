// Structure-agnostic layout invariants, swept over a page in a given pose.
//
// These deliberately assert *nothing* about the app's markup. They ask only the
// questions that have the same answer before and after a redesign — is anything
// off-screen, untappable, covered, or silently truncated — so a mobile overhaul
// can churn the DOM underneath them without invalidating the suite. They are
// viewport-agnostic too: a desktop stress pass can reuse them as-is.
//
// Every rule returns *all* offenders, not the first, because the output is meant
// to be read as a findings list rather than a pass/fail gate.

// Apple HIG and WCAG 2.5.5 both land on 44px. Between HARD and MIN a control is
// awkward; below HARD it is a genuine miss-target, so the two are graded apart.
export const TAP_TARGET_MIN  = 44;
export const TAP_TARGET_HARD = 32;

// Rules that fail a scenario outright. Everything else is recorded as a note:
// a discovery suite that failed on all of it would bury real regressions under
// known quirks.
//
// Tap-target size is deliberately *not* in here. The first run showed the app is
// built almost entirely from sub-32px controls — a desktop-density design
// carried across the breakpoint unchanged — so failing on it would mean a
// permanently red suite reporting one systemic fact several hundred times. It is
// a note, graded into two levels, and belongs in the overhaul's brief rather
// than in a regression gate.
const HARD_RULES = new Set(['page-error', 'body-overflow-x', 'offscreen-right', 'offscreen-left', 'occluded']);

const INTERACTIVE = 'button, a[href], select, input, textarea, [role="button"], [role="menuitem"], [tabindex]:not([tabindex="-1"])';

// Serialised into the page, so it must be self-contained.
function collect({ scope, tapMin, tapHard, interactiveSelector }) {
  const violations = [];
  const root = (scope && document.querySelector(scope)) || document.body;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // A short, human-readable path — enough to find the element by eye in the
  // source. Not a guaranteed-unique selector; these are read, not replayed.
  function path(el) {
    const parts = [];
    for (let n = el; n && n !== document.body && parts.length < 3; n = n.parentElement) {
      const cls = (n.className && typeof n.className === 'string')
        ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
      parts.unshift(n.tagName.toLowerCase() + cls);
    }
    return parts.join(' > ');
  }

  function visible(el, style, rect) {
    if (rect.width <= 0 || rect.height <= 0) return false;
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number(style.opacity) === 0) return false;
    return true;
  }

  // An element inside a deliberately x-scrollable container (a wide table, a
  // code block) is allowed to sit past the right edge — that is the documented
  // way to handle wide content, not a bug.
  function inScrollableX(el) {
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 1) return true;
    }
    return false;
  }

  // The part of an element actually on screen, after every clipping ancestor has
  // had its say. Returns null when the element is scrolled entirely out of view.
  //
  // An element scrolled out of a scroll container still has a bounding rect and
  // still computes as visible, so without this every rule below misreads it —
  // which is how the search dropdown's scrolled-off rows first looked like a
  // z-index bug when they were simply out of view. A partially-clipped row needs
  // the same care: its true centre can sit outside the container even though the
  // row is half on screen, so hit-testing has to use the visible box.
  function visibleRect(el, rect) {
    let top = rect.top, bottom = rect.bottom, left = rect.left, right = rect.right;
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const box = n.getBoundingClientRect();
      top    = Math.max(top, box.top);
      bottom = Math.min(bottom, box.bottom);
      left   = Math.max(left, box.left);
      right  = Math.min(right, box.right);
      if (bottom - top < 1 || right - left < 1) return null;
    }
    return { top, bottom, left, right };
  }

  function scrollableAncestor(el) {
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 1) return true;
    }
    return false;
  }

  // ── Body-level horizontal scroll ──────────────────────────────────────────
  if (document.documentElement.scrollWidth > vw + 1) {
    violations.push({
      rule: 'body-overflow-x',
      selector: 'html',
      detail: `scrollWidth ${document.documentElement.scrollWidth} > innerWidth ${vw}`,
    });
  }

  const all = root.querySelectorAll('*');

  for (const el of all) {
    const style = getComputedStyle(el);
    const rect  = el.getBoundingClientRect();
    if (!visible(el, style, rect)) continue;
    if (!visibleRect(el, rect)) continue;

    // ── Horizontal containment ──────────────────────────────────────────────
    if (!inScrollableX(el)) {
      if (rect.right > vw + 1) {
        violations.push({ rule: 'offscreen-right', selector: path(el),
          detail: `right edge ${Math.round(rect.right)} > viewport ${vw}` });
      }
      if (rect.left < -1) {
        violations.push({ rule: 'offscreen-left', selector: path(el),
          detail: `left edge ${Math.round(rect.left)} < 0` });
      }
    }

    // ── Silently truncated text ─────────────────────────────────────────────
    // Overflow is hidden, the content is wider than the box, and nothing tells
    // the user there is more — no ellipsis, no scrollbar.
    if (style.overflowX === 'hidden' && el.scrollWidth > el.clientWidth + 1
        && style.textOverflow !== 'ellipsis' && el.children.length === 0
        && (el.textContent || '').trim().length > 0) {
      violations.push({ rule: 'clipped-text', selector: path(el),
        detail: `content ${el.scrollWidth}px in ${el.clientWidth}px box, no ellipsis: "${el.textContent.trim().slice(0, 40)}"` });
    }

    // ── Content below the fold with no way to scroll to it ──────────────────
    if (rect.top < vh && rect.bottom > vh + 1 && !scrollableAncestor(el)
        && document.documentElement.scrollHeight <= vh + 1) {
      violations.push({ rule: 'unreachable', selector: path(el),
        detail: `bottom ${Math.round(rect.bottom)} past viewport ${vh} with no scrollable ancestor` });
    }
  }

  // ── Interactive-only rules ────────────────────────────────────────────────
  for (const el of root.querySelectorAll(interactiveSelector)) {
    const style = getComputedStyle(el);
    const rect  = el.getBoundingClientRect();
    if (!visible(el, style, rect)) continue;
    const shown = visibleRect(el, rect);
    if (!shown) continue;
    if (style.pointerEvents === 'none') continue;

    // Tap target size — measured as **hit area**, not as the visual box.
    //
    // WCAG 2.5.5 and the Apple HIG are both about the region that responds to
    // a tap, and the overhaul's touch-floor decision leans on that: a 24px chip
    // is allowed to carry a 44px target through padding or a stretched
    // ::before, so that growing 57 undersized controls does not fight the
    // density work reclaiming vertical space.
    //
    // Reading getBoundingClientRect alone made that decision unenforceable, and
    // worse than unenforceable — it would have failed the correct
    // implementation and passed only controls grown visually, which is the
    // opposite of the rule. So when the visual box is short, probe whether the
    // control actually owns the points a finger would land on. Four
    // elementFromPoint calls, and only for controls that fail on the box, so
    // the common case costs nothing.
    const w = Math.round(rect.width), h = Math.round(rect.height);
    const meetsFloor = (floor) => {
      if (w >= floor && h >= floor) return true;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const r  = floor / 2 - 1;
      const owns = (x, y) => {
        const hit = document.elementFromPoint(x, y);
        return !!hit && (hit === el || el.contains(hit));
      };
      return owns(cx - r, cy) && owns(cx + r, cy) && owns(cx, cy - r) && owns(cx, cy + r);
    };
    // `via hit area` in the detail is the tell that a control looked big enough
    // on paper and was not — i.e. someone put `.touch-floor` on an element that
    // clips its own overlay.
    if (!meetsFloor(tapHard)) {
      violations.push({ rule: 'tap-target-hard', selector: path(el), detail: `${w}x${h}px (hard floor ${tapHard})` });
    } else if (!meetsFloor(tapMin)) {
      violations.push({ rule: 'tap-target', selector: path(el), detail: `${w}x${h}px (recommended ${tapMin})` });
    }

    // Occlusion: is the thing actually tappable where it is drawn? Catches the
    // classic mobile failure — a backdrop or portal layer with the wrong
    // z-index silently eating every tap in a region.
    const cx = (shown.left + shown.right) / 2;
    const cy = (shown.top + shown.bottom) / 2;
    if (cx < 0 || cy < 0 || cx > vw || cy > vh) continue; // centre off-screen; the containment rules already caught it
    const hit = document.elementFromPoint(cx, cy);
    if (!hit) continue;
    if (hit === el || el.contains(hit) || hit.contains(el)) continue;

    const hitCls = typeof hit.className === 'string' ? hit.className : '';
    // Two ways a cover is *expected*. The first is a named backdrop. The
    // second is structural and so survives markup churn: the thing on top
    // lives inside a fixed-position layer that the target is not part of —
    // i.e. an open dialog, sheet or menu, which is supposed to cover the page
    // behind it. Without this, every portalled layer the overhaul adds reads
    // as a hard occlusion failure for everything underneath it, which is noise
    // rather than signal.
    let inFixedLayer = false;
    for (let node = hit; node && node !== document.body; node = node.parentElement) {
      if (getComputedStyle(node).position !== 'fixed') continue;
      if (!node.contains(el)) { inFixedLayer = true; }
      break;
    }
    const backdropish = /backdrop|overlay|scrim/i.test(hitCls) || inFixedLayer;
    violations.push({
      // A layer covering a control is expected while that layer is open, so it
      // is graded down unless the caller scoped the sweep to the active layer.
      rule: backdropish && !scope ? 'occluded-by-overlay' : 'occluded',
      selector: path(el),
      detail: `centre hit ${path(hit)} instead`,
    });
  }

  return violations;
}

// Attach error capture to a page. Call once, before driving it.
//
// Only uncaught exceptions count. Console errors are not used: the container's
// egress proxy blocks the analytics script, so every page logs a
// "Failed to load resource" that has nothing to do with the app.
export function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

// Sweep the current pose. Returns { failures, notes }, each an array of
// { rule, selector, detail }.
//
// `scope` restricts the interactive rules to the currently-active layer — pass
// it when a panel, popover or sheet is open, so controls legitimately sitting
// behind a backdrop are not reported as unreachable.
export async function sweep(page, { scope = null, tapMin = TAP_TARGET_MIN, tapHard = TAP_TARGET_HARD, errors = [] } = {}) {
  const violations = await page.evaluate(collect, {
    scope, tapMin, tapHard, interactiveSelector: INTERACTIVE,
  });

  for (const message of errors) {
    violations.push({ rule: 'page-error', selector: '(window)', detail: message });
  }

  // Collapse repeats. One under-sized control rendered once per entry row is a
  // single finding about that control, not thirty-four findings — and a list of
  // thirty-four identical lines is what stops anyone reading the output at all.
  const collapsed = new Map();
  for (const v of violations) {
    const key = `${v.rule}|${v.selector}`;
    const seen = collapsed.get(key);
    if (seen) seen.count += 1;
    else collapsed.set(key, { ...v, count: 1 });
  }
  const unique = [...collapsed.values()];

  return {
    failures: unique.filter((v) => HARD_RULES.has(v.rule)),
    notes:    unique.filter((v) => !HARD_RULES.has(v.rule)),
  };
}
