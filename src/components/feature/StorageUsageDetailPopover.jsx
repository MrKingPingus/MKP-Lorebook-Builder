// Click-opened detail popover for the storage usage ring
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatBytes } from '../../services/format-bytes.js';

const CATEGORY_LABELS = {
  snapshots:    'Snapshots',
  entryContent: 'Entry content',
  index:        'Lorebook index',
  settings:     'Settings',
  windowState:  'Window state',
};
const CATEGORY_ORDER = ['snapshots', 'entryContent', 'index', 'settings', 'windowState'];

export function StorageUsageDetailPopover({
  anchorRect,
  totalBytes,
  quotaBytes,
  percent,
  tier,
  breakdown,
  onRefresh,
  onClose,
}) {
  const popoverRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) onClose();
    }
    const id = setTimeout(() => document.addEventListener('click', onDocClick), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('click', onDocClick);
    };
  }, [onClose]);

  if (!anchorRect) return null;
  const style = {
    position: 'fixed',
    top:  anchorRect.bottom + 6,
    left: Math.max(8, Math.min(anchorRect.right - 280, window.innerWidth - 288)),
  };

  const pct = Math.round(percent * 100);

  return createPortal(
    <div
      ref={popoverRef}
      className={`storage-usage-detail-popover tier-${tier}`}
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="storage-usage-detail-title">Storage usage</div>
      <div className="storage-usage-detail-total">
        <span>{formatBytes(totalBytes)} / {formatBytes(quotaBytes)}</span>
        <span className="storage-usage-detail-percent">{pct}%</span>
      </div>
      <div className="storage-usage-bar">
        <div
          className={`storage-usage-bar-fill tier-${tier}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <ul className="storage-usage-detail-list">
        {CATEGORY_ORDER.map((key) => {
          const bytes = breakdown[key] ?? 0;
          const sharePct = totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0;
          return (
            <li key={key} className="storage-usage-detail-row">
              <span className="storage-usage-detail-label">{CATEGORY_LABELS[key]}</span>
              <span className="storage-usage-detail-bytes">{formatBytes(bytes)}</span>
              <span className="storage-usage-detail-share">{sharePct}%</span>
            </li>
          );
        })}
      </ul>
      <div className="storage-usage-detail-footer">
        <button type="button" className="storage-usage-refresh-btn" onClick={onRefresh}>
          Refresh
        </button>
      </div>
    </div>,
    document.body,
  );
}
