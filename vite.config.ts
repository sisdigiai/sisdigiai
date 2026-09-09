import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {execSync} from 'child_process';
import {defineConfig} from 'vite';

// Identidade do build, gravada no bundle. Existe porque "qual commit está no ar?"
// foi respondido três vezes em 08-09/09/2026 por marcador improvisado — uma string
// que só existisse no commit novo. Quando o commit não acrescenta string nenhuma
// (por exemplo, quando ele só REMOVE um literal), não há marcador e a conferência
// trava. Com isto, todo build carrega o seu próprio: `data-build` no <html> e o
// hash greppável dentro do .js publicado.
// Fallback 'desconhecido' se o git não estiver disponível — build não quebra por isto.
function refDoBuild(): string {
  try {
    const h = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const sujo = execSync('git status --porcelain', { encoding: 'utf8' }).trim() !== '';
    return sujo ? `${h}+local` : h;
  } catch {
    return 'desconhecido';
  }
}

export default defineConfig(() => {
  return {
    define: { __BUILD_REF__: JSON.stringify(refDoBuild()) },
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
