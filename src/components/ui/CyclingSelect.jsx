// A native <select> that also cycles through its options on Shift+scroll — the
// affordance TypeSelector pioneered, factored out so every dropdown can share
// it. Drop-in for <select>: pass the usual value / onChange / <option> children
// and any extra props. onChange receives a native-style event ({ target.value }),
// so existing `(e) => setX(e.target.value)` handlers work unchanged.
import { Children } from 'react';

export function CyclingSelect({ value, onChange, children, ...rest }) {
  function onWheel(e) {
    if (!e.shiftKey) return;
    // Option values in render order, skipping disabled ones.
    const values = [];
    Children.forEach(children, (child) => {
      if (child && child.props && child.props.value !== undefined && !child.props.disabled) {
        values.push(child.props.value);
      }
    });
    if (values.length === 0) return;
    e.preventDefault();
    const idx  = values.indexOf(value);
    const base = idx === -1 ? 0 : idx;
    const next = Math.min(values.length - 1, Math.max(0, base + (e.deltaY > 0 ? 1 : -1)));
    if (values[next] !== value) onChange({ target: { value: values[next] } });
  }

  return (
    <select value={value} onChange={onChange} onWheel={onWheel} {...rest}>
      {children}
    </select>
  );
}
