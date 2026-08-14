/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vanillaExtractPlugin(), react(), cloudflare()],
  // Vite はデフォルトで VITE_ プレフィックス付きの env しか import.meta.env に
  // 露出しないため、非 VITE_ 変数 SERVER_ON_RENDER をビルド時に焼き込む。
  envPrefix: ['VITE_', 'SERVER_ON_RENDER'],
  resolve: {},
  build: {
    chunkSizeWarningLimit: 100000000,
  },
  server: {
    watch: {
      usePolling: true,
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/vitest-setup.ts'],
  },
});