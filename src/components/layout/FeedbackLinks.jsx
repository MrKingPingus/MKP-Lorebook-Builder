// Header feedback icons — bug report + feature request, opening the guided
// GitHub issue forms in a new tab. SVG (currentColor) so they scale crisply and
// follow the theme, unlike the emoji used elsewhere. A second, more visible
// home for the links that otherwise only live in the lander footer (issue #113).
import { BUG_REPORT_URL, FEATURE_REQUEST_URL } from '../../constants/links.js';

function BugIcon() {
  return (
    <svg className="header-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m8 2 1.88 1.88" />
      <path d="M14.12 3.88 16 2" />
      <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
      <path d="M12 20v-9" />
      <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
      <path d="M6 13H2" />
      <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
      <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
      <path d="M22 13h-4" />
      <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg className="header-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}

export function FeedbackLinks() {
  return (
    <div className="header-feedback" onPointerDown={(e) => e.stopPropagation()}>
      <a
        className="header-icon-btn"
        href={BUG_REPORT_URL}
        target="_blank"
        rel="noreferrer"
        title="Report a bug"
        aria-label="Report a bug"
      >
        <BugIcon />
      </a>
      <a
        className="header-icon-btn"
        href={FEATURE_REQUEST_URL}
        target="_blank"
        rel="noreferrer"
        title="Request a feature"
        aria-label="Request a feature"
      >
        <LightbulbIcon />
      </a>
    </div>
  );
}
