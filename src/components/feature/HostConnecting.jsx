// What the frame shows between boot and the host's mkp:load. Normally a
// fraction of a second; after HOST_CONNECT_HINT_MS it explains itself, since
// the likeliest cause of a long wait is the page being opened outside CharSnap
// with the flag still on the URL.
import { useEffect, useState } from 'react';
import { HOST_CONNECT_HINT_MS } from '../../constants/host.js';

export function HostConnecting() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), HOST_CONNECT_HINT_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="host-connecting" role="status" aria-live="polite">
      <div className="host-connecting-spinner" aria-hidden="true" />
      <div className="host-connecting-label">Connecting to CharSnap…</div>
      {slow && (
        <div className="host-connecting-hint">
          Still waiting for CharSnap to send the lorebook. If this page was opened on its own,
          open the lorebook from charsnap.ai instead.
        </div>
      )}
    </div>
  );
}
