// Subscribes to storage-service writes and exposes a derived usage snapshot for the ring + popovers.
// The measureLorebook callback is the only place schema knowledge lives — storage-service stays schema-agnostic.
import { useCallback, useEffect, useState } from 'react';
import {
  getStorageBreakdown,
  getStorageQuota,
  subscribeToWrites,
} from '../services/storage-service.js';
import { useSettingsStore } from '../state/settings-store.js';
import {
  STORAGE_WARN_THRESHOLD,
  STORAGE_DANGER_THRESHOLD,
} from '../constants/limits.js';
import { warningColor, storageStops, isGradient } from '../services/warning-color.js';

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
  const profile = useSettingsStore((s) => s.storageQuotaProfile);
  const warningScale = useSettingsStore((s) => s.warningScale);
  const quotaBytes = getStorageQuota(profile);

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
  // The ring's resting colour is muted, not green — it is a gauge, not a health
  // readout, and a green ring at 3% full would read as an achievement. Callers
  // hand this to CSS as --tier-color so one value drives ring, bar and text.
  const tierColor  = warningColor(percent, storageStops(warningScale), {
    gradient: isGradient(warningScale),
    base: 'var(--muted2)',
  });

  return { totalBytes, quotaBytes, percent, tier, tierColor, breakdown: usage.breakdown, refresh };
}
