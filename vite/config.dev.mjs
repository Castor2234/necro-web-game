import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),

    {
      name: 'full-reload-on-no-modules',
      hotUpdate({ modules, server }) {
        if (modules.length === 0) {
          server.hot.send({
            type: 'full-reload',
            path: '*',
          });
        }
      },
    },
  ],

  resolve: {
    alias: {
      // Matches "paths": { "@/*": ["src/*"] } in tsconfig.json
      '@': fileURLToPath(new URL('../src', import.meta.url)),
    },
  },

  server: {
    port: 8080,
  },
});
