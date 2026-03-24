import { defineConfig } from 'vite';

// The repo name is always the bit after the “/” 
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';

export default defineConfig({
    // Locally you still get “/”, but on Actions you get “/repositoryName/”
    base: process.env.GITHUB_ACTIONS === 'true' ? `/${repositoryName}/` : '/'
});
