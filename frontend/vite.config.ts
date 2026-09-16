import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte(),
  ],
  resolve: {
    alias: {
      '$lib': path.resolve(import.meta.dirname, './src/lib'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/login': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/masuk_ke_pembukuan': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/profile_img': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
