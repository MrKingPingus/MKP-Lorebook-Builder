// React entry point — mounts <App> into #root and imports global styles
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { readJson } from './services/storage-service.js';
import { SETTINGS_KEY } from './constants/storage-keys.js';
import { applyTheme } from './services/theme-service.js';
import './style.css';

// Apply the persisted theme before the first paint so there's no dark→light
// flash. use-theme (mounted in App) keeps it in sync after this.
const savedSettings = readJson(SETTINGS_KEY);
applyTheme(savedSettings?.theme, savedSettings?.customColors);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
