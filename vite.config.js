import { defineConfig } from 'vite';

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
  server: {
    port: 3000,
    open: true
  }
});