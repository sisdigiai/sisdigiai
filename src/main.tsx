import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import './index.css';

// Identidade do build (vite.config.ts). Fica no <html data-build> e, por tabela,
// como string no bundle — e daí dá para dizer QUAL commit está no ar sem depender
// de marcador improvisado.
declare const __BUILD_REF__: string;
document.documentElement.dataset.build = __BUILD_REF__;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
);
