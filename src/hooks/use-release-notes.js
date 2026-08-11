// Whether there's a release the user hasn't been shown, and the means to
// dismiss it. Backs the update notice on the lander.
import { useState, useCallback, useEffect } from 'react';
import { readJson, writeJson }   from '../services/storage-service.js';
import { latestRelease, shouldShowUpdateNotice } from '../services/release-notes.js';
import { LAST_SEEN_RELEASE_KEY, LOREBOOK_INDEX_KEY } from '../constants/storage-keys.js';
import changelogRaw              from '../../CHANGELOG.md?raw';

// Parsed once at module load. The changelog is bundled at build time, so it
// cannot change while the app is running and re-parsing per render would be
// pure waste.
const LATEST = latestRelease(changelogRaw);

export function useReleaseNotes() {
  // Someone with saved lorebooks has used the app before, which is what
  // separates "returning user who predates this feature" from "first ever visit".
  //
  // Read straight from storage rather than from lorebook-store: the store is
  // hydrated by bootstrap, so on the first render its index is still empty. Going
  // through it meant a returning user looked brand new for a frame, the silent
  // seed fired, and they were marked up to date before their books had loaded —
  // so the notice never appeared for exactly the people it exists for.
  const [hasExistingWork] = useState(() => (readJson(LOREBOOK_INDEX_KEY, []) ?? []).length > 0);

  const [lastSeen, setLastSeen] = useState(() => readJson(LAST_SEEN_RELEASE_KEY, null));

  const open = shouldShowUpdateNotice({
    latestId: LATEST?.id ?? null,
    lastSeen,
    hasExistingWork,
    hasUserFacingContent: (LATEST?.userBlocks?.length ?? 0) > 0,
  });

  // A first-time visitor is shown nothing — but the current release still has to
  // be recorded, silently. Without this they'd be marked as never having seen a
  // release, so the first time they saved a lorebook and came back they'd be
  // greeted by a notice about a release that shipped before they ever arrived.
  useEffect(() => {
    if (!LATEST || lastSeen !== null || hasExistingWork) return;
    writeJson(LAST_SEEN_RELEASE_KEY, LATEST.id);
    setLastSeen(LATEST.id);
  }, [lastSeen, hasExistingWork]);

  // Dismissing records the release, so it never reappears for this release even
  // across reloads. A user who wants it back reads the changelog on the lander,
  // which is always there.
  const dismiss = useCallback(() => {
    if (!LATEST) return;
    writeJson(LAST_SEEN_RELEASE_KEY, LATEST.id);
    setLastSeen(LATEST.id);
  }, []);

  return {
    open,
    release: LATEST,
    dismiss,
  };
}
