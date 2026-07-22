// React entry point — mounts <App> into #root and imports global styles
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { readJson } from './services/storage-service.js';
import { SETTINGS_KEY } from './constants/storage-keys.js';
import { applyTheme } from './services/theme-service.js';
import { applyUiScale, applyReduceMotion } from './services/accessibility-service.js';
import './style.css';

// Apply persisted theme + accessibility prefs before the first paint so there's
// no flash/resize. use-theme + use-accessibility (mounted in App) keep them in
// sync afterward.
const savedSettings = readJson(SETTINGS_KEY);
applyTheme(savedSettings?.theme, savedSettings?.customColors);
applyUiScale(savedSettings?.uiScale ?? 1);
applyReduceMotion(savedSettings?.reduceMotion ?? false);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
