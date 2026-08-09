import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  // Relative base is load-bearing, not a preference. It makes the built artifact
  // position-independent, so the identical output works at the distribution root
  // (production) and under a `pr-<n>/` prefix (previews). See research.md D1/D5.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Content-hashed asset names are what make publishing atomic: a new version's
    // files never collide with the old version's, so both can coexist while only
    // index.html is replaced. See research.md D2.
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
