/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Served from https://<user>.github.io/tech-video-repurposer/ on GitHub Pages.
  base: process.env.GITHUB_PAGES === 'true' ? '/tech-video-repurposer/' : '/',
  optimizeDeps: {
    // FFmpeg spawns its own worker; pre-bundling breaks the worker URL.
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
