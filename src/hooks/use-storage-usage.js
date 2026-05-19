// Subscribes to storage-service writes and exposes a derived usage snapshot for the ring + popovers.
// The measureLorebook callback is the only place schema knowledge lives — storage-service stays schema-agnostic.
import { useCallback, useEffect, useState } from 'react';
import {
  getStorageBreakdown,
  getStorageQuota,
  subscribeToWrites,
} from '../services/storage-service.js';
import {
  STORAGE_WARN_THRESHOLD,
  STORAGE_DANGER_THRESHOLD,
} from '../constants/limits.js';

// Returns the uncompressed character count of the snapshot arrays and of the whole lorebook.
// storage-service applies the snapshots/total ratio to actual (post-compression) bytes so
// the breakdown reflects real on-disk usage.
function measureLorebook(parsed) {
  let snapshots = 0;
  if (parsed && Array.isArray(parsed.entries)) {
    for (const entry of parsed.entries) {
      if (Array.isArray(entry.snapshots) && entry.snapshots.length > 0) {
        snapshots += JSON.stringify(entry.snapshots).length;
      }
    }
  }
  const total = parsed ? JSON.stringify(parsed).length : 0;
  return { snapshots, total };
}

function tierFor(percent) {
  if (percent >= STORAGE_DANGER_THRESHOLD) return 'danger';
  if (percent >= STORAGE_WARN_THRESHOLD)   return 'warn';
  return 'normal';
}

export function useStorageUsage() {
  const [usage, setUsage] = useState(() => getStorageBreakdown({ measureLorebook }));
  const quotaBytes = getStorageQuota();

  useEffect(() => {
    const unsubscribe = subscribeToWrites(() => {
      setUsage(getStorageBreakdown({ measureLorebook }));
    });
    return () => { unsubscribe(); };
  }, []);

  const refresh = useCallback(() => {
    setUsage(getStorageBreakdown({ measureLorebook }));
  }, []);

  const totalBytes = usage.totalBytes;
  const percent    = quotaBytes > 0 ? Math.min(1, totalBytes / quotaBytes) : 0;
  const tier       = tierFor(percent);

  return { totalBytes, quotaBytes, percent, tier, breakdown: usage.breakdown, refresh };
}
