// The header logo, as a button: it opens a small menu of links to the
// builder's author, on CharSnap and on GitHub.
//
// A menu rather than a straight link so there is room for more than one place
// to find them, and so a stray click on the logo never sends anyone off-site.
// It anchors below the logo and opens on click, not hover: the logo sits at
// the window's top-left corner where the pointer passes on its way to drag
// the window, and a hover menu there would keep popping open.
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDismissLayer } from '../../hooks/use-dismiss-layer.js';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';
import { CREATOR_NAME, CREATOR_CHARSNAP_URL, CREATOR_GITHUB_URL, REPO_URL } from '../../constants/links.js';

export function CreatorMenu({ children }) {
  const [anchor, setAnchor] = useState(null);
  const btnRef  = useRef(null);
  const menuRef = useRef(null);
  const open = anchor !== null;
  const close = () => setAnchor(null);

  useDismissLayer('creator-menu', open, DISMISS_PRIORITY.popover, close);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      close();
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => { if (open) menuRef.current?.querySelector('a')?.focus(); }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="header-logo-btn touch-floor"
        onClick={() => (open ? close() : setAnchor(btnRef.current.getBoundingClientRect()))}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Made by ${CREATOR_NAME}`}
      >
        {children}
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="creator-menu"
          role="menu"
          style={{ top: anchor.bottom + 6, left: Math.max(8, anchor.left) }}
        >
          <div className="creator-menu-head">Made by {CREATOR_NAME}</div>
          <a className="creator-menu-item" role="menuitem" href={CREATOR_CHARSNAP_URL} target="_blank" rel="noreferrer" onClick={close}>
            My characters on CharSnap ↗
          </a>
          <a className="creator-menu-item" role="menuitem" href={CREATOR_GITHUB_URL} target="_blank" rel="noreferrer" onClick={close}>
            Me on GitHub ↗
          </a>
          <a className="creator-menu-item creator-menu-item--quiet" role="menuitem" href={REPO_URL} target="_blank" rel="noreferrer" onClick={close}>
            This builder’s source code ↗
          </a>
        </div>,
        document.body,
      )}
    </>
  );
}
