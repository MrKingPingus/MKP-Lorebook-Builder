// Desktop-only summary popover anchored to the StorageUsageRing on hover
import { createPortal } from 'react-dom';
import { formatBytes } from '../../services/format-bytes.js';
import { useAnchoredPosition } from '../../hooks/use-anchored-position.js';

const WIDTH_PX = 200;

export function StorageUsageHoverPopover({ anchorRect, totalBytes, quotaBytes, percent, tier, tierColor }) {
  const style = useAnchoredPosition(anchorRect, WIDTH_PX);
  if (!style) return null;
  const pct = Math.round(percent * 100);
  return createPortal(
    <div className={`storage-usage-hover-popover tier-${tier}`} style={{ ...style, '--tier-color': tierColor }}>
      {formatBytes(totalBytes)} / {formatBytes(quotaBytes)} used ({pct}%)
    </div>,
    document.body,
  );
}
