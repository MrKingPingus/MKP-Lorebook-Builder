// Desktop-only summary popover anchored to the StorageUsageRing on hover
import { createPortal } from 'react-dom';
import { formatBytes } from '../../services/format-bytes.js';

export function StorageUsageHoverPopover({ anchorRect, totalBytes, quotaBytes, percent, tier }) {
  if (!anchorRect) return null;
  const style = {
    position: 'fixed',
    top:  anchorRect.bottom + 6,
    left: Math.max(8, Math.min(anchorRect.right - 200, window.innerWidth - 208)),
  };
  const pct = Math.round(percent * 100);
  return createPortal(
    <div className={`storage-usage-hover-popover tier-${tier}`} style={style}>
      {formatBytes(totalBytes)} / {formatBytes(quotaBytes)} used ({pct}%)
    </div>,
    document.body,
  );
}
