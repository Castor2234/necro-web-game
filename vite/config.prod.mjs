import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const phasermsg = () => {
  return {
    name: 'phasermsg',
    buildStart() {
      import.meta.stdout.write(`Building for production...\n`);
    },
    buildEnd() {
      const line = '---------------------------------------------------------';
      const msg = `❤️❤️❤️ Tell us about your game! - games@phaser.io ❤️❤️❤️`;
      import.meta.stdout.write(`${line}\n${msg}\n${line}\n`);

      import.meta.stdout.write(`✨ Done ✨\n`);
    },
  };
};

export default defineConfig({
  base: './',
  plugins: [react(), phasermsg()],

  logLevel: 'warning',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 2,
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
  },
});

