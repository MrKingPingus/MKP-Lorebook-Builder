// Click-opened detail popover for the storage usage ring
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatBytes } from '../../services/format-bytes.js';
import { useSettings } from '../../hooks/use-settings.js';
import { useAnchoredPosition } from '../../hooks/use-anchored-position.js';
import {
  STORAGE_QUOTA_PROFILE_WEBKIT,
  STORAGE_QUOTA_PROFILE_OTHER,
} from '../../constants/limits.js';

function ProfileSelect() {
  const { storageQuotaProfile, setStorageQuotaProfile } = useSettings();
  return (
    <select
      className="storage-usage-detail-profile-select"
      value={storageQuotaProfile ?? STORAGE_QUOTA_PROFILE_WEBKIT}
      onChange={(e) => setStorageQuotaProfile(e.target.value)}
    >
      <option value={STORAGE_QUOTA_PROFILE_WEBKIT}>Safari / iPhone / iPad (5 MB)</option>
      <option value={STORAGE_QUOTA_PROFILE_OTHER}>Chrome / Firefox / Edge / etc. (10 MB)</option>
    </select>
  );
}

const CATEGORY_LABELS = {
  snapshots:    'Checkpoints',
  entryContent: 'Entry content',
  index:        'Lorebook index',
  settings:     'Settings',
  windowState:  'Window state',
};
const CATEGORY_ORDER = ['snapshots', 'entryContent', 'index', 'settings', 'windowState'];
const WIDTH_PX = 280;

export function StorageUsageDetailPopover({
  anchorRect,
  totalBytes,
  quotaBytes,
  percent,
  tier,
  tierColor,
  breakdown,
  onRefresh,
  onClose,
}) {
  const popoverRef = useRef(null);
  const style = useAnchoredPosition(anchorRect, WIDTH_PX);

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

  if (!style) return null;

  const pct = Math.round(percent * 100);

  return createPortal(
    <div
      ref={popoverRef}
      className={`storage-usage-detail-popover tier-${tier}`}
      style={{ ...style, '--tier-color': tierColor }}
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
      <div className="storage-usage-detail-profile">
        <label className="storage-usage-detail-profile-label">Browser</label>
        <ProfileSelect />
      </div>
      <div className="storage-usage-detail-footer">
        <button type="button" className="storage-usage-refresh-btn" onClick={onRefresh}>
          Refresh
        </button>
      </div>
    </div>,
    document.body,
  );
}
