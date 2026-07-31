// The running build's version, injected from package.json at build time by
// vite.config.js. Shown in the status bar so a bug report can name an exact
// build, and used as nothing else — the update notice keys off the changelog's
// release heading, not this.
//
// 0.x is deliberate: the builder is real and in daily use, but not yet
// committed to permanence. 1.0 is reserved for the integration going live.
/* global __APP_VERSION__ */
export const APP_VERSION = __APP_VERSION__;
