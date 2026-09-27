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
    outDir: '../../src/setup/dist',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
  },
});
