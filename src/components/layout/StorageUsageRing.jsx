// Header ring indicator showing total localStorage usage; hover→summary, click→detail
import { useRef, useState } from 'react';
import { useMobile } from '../../hooks/use-mobile.js';
import { useStorageUsage } from '../../hooks/use-storage-usage.js';
import { StorageUsageHoverPopover } from '../feature/StorageUsageHoverPopover.jsx';
import { StorageUsageDetailPopover } from '../feature/StorageUsageDetailPopover.jsx';

const SIZE = 22;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function StorageUsageRing() {
  const isMobile = useMobile();
  const { totalBytes, quotaBytes, percent, tier, breakdown, refresh } = useStorageUsage();
  const btnRef = useRef(null);
  const [hoverOpen, setHoverOpen]   = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [anchor, setAnchor]         = useState(null);

  function captureAnchor() {
    setAnchor(btnRef.current?.getBoundingClientRect() ?? null);
  }
  function onEnter() {
    if (isMobile || detailOpen) return;
    captureAnchor();
    setHoverOpen(true);
  }
  function onLeave() {
    if (isMobile) return;
    setHoverOpen(false);
  }
  function onClick() {
    if (detailOpen) {
      setDetailOpen(false);
      return;
    }
    captureAnchor();
    setHoverOpen(false);
    setDetailOpen(true);
  }

  const dashOffset = CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, percent)));

  return (
    <div className="storage-usage-ring-wrap" onPointerDown={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        className={`storage-usage-ring tier-${tier}`}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={onClick}
        title="Storage usage"
        aria-label="Storage usage"
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <circle
            className="storage-usage-ring-track"
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
          />
          <circle
            className="storage-usage-ring-fill"
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
      </button>

      {hoverOpen && !detailOpen && (
        <StorageUsageHoverPopover
          anchorRect={anchor}
          totalBytes={totalBytes}
          quotaBytes={quotaBytes}
          percent={percent}
          tier={tier}
        />
      )}

      {detailOpen && (
        <StorageUsageDetailPopover
          anchorRect={anchor}
          totalBytes={totalBytes}
          quotaBytes={quotaBytes}
          percent={percent}
          tier={tier}
          breakdown={breakdown}
          onRefresh={refresh}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </div>
  );
}
