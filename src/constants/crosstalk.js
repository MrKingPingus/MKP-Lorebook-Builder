// Crosstalk feature gate — read once from the URL at module load. The active+
// reference layout and any mode-specific UI branches all key off this flag.
// Toggling without a reload is not supported. Removed in Phase 9 E1.
export const CROSSTALK_ENABLED = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('crosstalk') === '1';
