import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// package.json is the single source for the version; the app reads it through
// constants/version.js. Injected at build time rather than imported, so the
// whole manifest doesn't end up in the bundle just to get one string.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));


export default defineConfig({
    plugins: [react()],
    define: { __APP_VERSION__: JSON.stringify(version) },
    // Relative asset paths, so the built dist/ folder can be served from any
    // path on any host without rebuilding — drop it wherever it should live.
    base: './'
});
