// Subscribes to storage-service writes and exposes a derived usage snapshot for the ring + popovers.
// The measureLorebook callback is the only place schema knowledge lives — storage-service stays schema-agnostic.
import { useCallback, useEffect, useState } from 'react';
import {
  getStorageBreakdown,
  getStorageQuota,
  subscribeToWrites,
} from '../services/storage-service.js';
import {
  STORAGE_QUOTA_FALLBACK_BYTES,
  STORAGE_WARN_THRESHOLD,
  STORAGE_DANGER_THRESHOLD,
} from '../constants/limits.js';

function measureLorebook(parsed) {
  let snapshots = 0;
  if (parsed && Array.isArray(parsed.entries)) {
    for (const entry of parsed.entries) {
      if (Array.isArray(entry.snapshots) && entry.snapshots.length > 0) {
        snapshots += JSON.stringify(entry.snapshots).length;
      }
    }
  }
  return { snapshots };
}

function tierFor(percent) {
  if (percent >= STORAGE_DANGER_THRESHOLD) return 'danger';
  if (percent >= STORAGE_WARN_THRESHOLD)   return 'warn';
  return 'normal';
}

export function useStorageUsage() {
  const [usage, setUsage] = useState(() => getStorageBreakdown({ measureLorebook }));
  const [quotaBytes, setQuotaBytes] = useState(STORAGE_QUOTA_FALLBACK_BYTES);

  useEffect(() => {
    let mounted = true;
    getStorageQuota().then((q) => { if (mounted) setQuotaBytes(q); });
    const unsubscribe = subscribeToWrites(() => {
      setUsage(getStorageBreakdown({ measureLorebook }));
    });
    return () => { mounted = false; unsubscribe(); };
  }, []);

  const refresh = useCallback(() => {
    setUsage(getStorageBreakdown({ measureLorebook }));
  }, []);

  const totalBytes = usage.totalBytes;
  const percent    = quotaBytes > 0 ? Math.min(1, totalBytes / quotaBytes) : 0;
  const tier       = tierFor(percent);

  return { totalBytes, quotaBytes, percent, tier, breakdown: usage.breakdown, refresh };
}
