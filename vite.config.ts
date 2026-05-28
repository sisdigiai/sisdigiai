import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR desligado no AI Studio via DISABLE_HMR; file watching off evita flicker durante edicao do agente.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
