/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vanillaExtractPlugin(), react()],
  resolve: {},
  build: {
    chunkSizeWarningLimit: 100000000,
  },
  server: {
    watch: {
      usePolling: true,
    },
    // proxy: {
    //   '/event': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    //   '/date': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    //   '/timetable': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    //   '/refresh': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    //   '/group': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    // },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/vitest-setup.ts'],
  },
});
