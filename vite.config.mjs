import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import createCertificateServerMiddleware from './server/certificate-middleware.mjs';

export default defineConfig({
  plugins: [react()],
  server: {
    middlewareMode: false,
    // Agregar middleware personalizado
    middleware: [
      createCertificateServerMiddleware()
    ]
  }
});

