import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/forks/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Split the heavy Babylon stack and React into separate, cacheable
        // chunks instead of one ~7 MB bundle — improves startup parse time and
        // lets the engine code cache across app updates.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('babylonjs-editor-tools')) return 'editor-tools';
          if (id.includes('@babylonjs/loaders')) return 'babylon-loaders';
          if (id.includes('@babylonjs/materials')) return 'babylon-materials';
          if (id.includes('@babylonjs/gui')) return 'babylon-gui';
          if (id.includes('@babylonjs/core')) return 'babylon-core';
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
          return 'vendor';
        },
      },
    },
  },
  optimizeDeps: {
    entries: ['index.html'],
    // Babylon is already native ESM and is imported through explicit subpaths.
    // Prebundling the package barrels creates a multi-megabyte cache and stalls
    // first launch on modest Windows/OneDrive workstations.
    exclude: ['@babylonjs/core', '@babylonjs/loaders', '@babylonjs/materials'],
  },
});
