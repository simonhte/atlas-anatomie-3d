import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base: './' pour que l'app fonctionne aussi bien en local que sur
// GitHub Pages (servie depuis un sous-dossier /atlas-anatomie-3d/).
export default defineConfig({
  base: './',
  plugins: [svelte()],
  server: { host: true, port: 5173 },
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
