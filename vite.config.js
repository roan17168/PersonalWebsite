import { defineConfig } from 'vite';
import { cpSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Set this to match your GitHub repo name, or '/' if using username.github.io
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html',
        project: 'project.html'
      }
    }
  },
  plugins: [{
    name: 'copy-project-previews',
    closeBundle() {
      cpSync(resolve(rootDir, 'projects'), resolve(rootDir, 'dist/projects'), { recursive: true });
    }
  }],
  server: {
    port: 3000,
    open: true
  }
});