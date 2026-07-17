/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import reactRefresh from '@vitejs/plugin-react-refresh';
import Checker from 'vite-plugin-checker';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vanillaExtractPlugin(), react(),
    reactRefresh(),
    Checker({
      typescript: true,
      overlay: true,
      eslint: {
        lintCommand: 'eslint "./src/**/*.{ts,tsx}"'
      },
    }),
  ],
  // 依存関係の事前バンドル
  // https://ja.vitejs.dev/guide/dep-pre-bundling.html
  // optimizeDeps: { exclude: ['interactjs'] },
  // optimizeDeps: {
  //   include: ['esm-dep > cjs-dep'],
  // },
  resolve: {
    // alias: {
    //   "interactjs": path.resolve(__dirname, "node_modules/interactjs"),
    // }
  },
  envDir: './env',
  build: {
    chunkSizeWarningLimit: 100000000,
    // rollupOptions: {
    //   output: {
    //     manualChunks: {
    //       loadsh: ['lodash']
    //     }
    //   }
    // }
  },
  server: {
    watch: {
      usePolling: true,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ["./src/tests/vitest-setup.ts"]
  }
})
