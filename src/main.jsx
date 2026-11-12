// React entry point — mounts <App> into #root and imports global styles
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { readJson } from './services/storage-service.js';
import { SETTINGS_KEY } from './constants/storage-keys.js';
import { applyTheme } from './services/theme-service.js';
import { applyUiScale, applyReduceMotion } from './services/accessibility-service.js';
import { detectHostMode } from './services/host-bridge.js';
import { useHostStore }   from './state/host-store.js';
import { useUiStore }     from './state/ui-store.js';
import './style.css';

// Apply persisted theme + accessibility prefs before the first paint so there's
// no flash/resize. use-theme + use-accessibility (mounted in App) keep them in
// sync afterward.
const savedSettings = readJson(SETTINGS_KEY);
applyTheme(savedSettings?.theme, savedSettings?.customColors);
applyUiScale(savedSettings?.uiScale ?? 1);
applyReduceMotion(savedSettings?.reduceMotion ?? false);

// Host (embedded) mode is decided once, here, from the URL and the frame
// relationship, so every later branch reads a flag rather than re-deriving it.
// The lander is skipped: the host page is the front door in that setup.
if (detectHostMode()) {
  useHostStore.getState().setEnabled(true);
  useUiStore.getState().setShowLander(false);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
