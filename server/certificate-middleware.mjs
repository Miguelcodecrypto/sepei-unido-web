import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Crear un servidor HTTP simple que maneje el endpoint de certificados
export function createCertificateServerMiddleware() {
  return (req, res, next) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    
    // Manejar endpoint de certificado
    if (url.pathname === '/api/certificate/verify') {
      res.setHeader('Content-Type', 'application/json');
      
      console.log('[Certificate Middleware] Solicitud recibida en:', url.pathname);
      console.log('[Certificate Middleware] Method:', req.method);
      
      // Simular respuesta del certificado
      // En producción HTTPS, esto disparará el diálogo del navegador
      const response = {
        status: 'requesting',
        message: 'En un servidor HTTPS con soporte de certificados de cliente, el navegador mostraría un diálogo de selección ahora.',
        supported: true
      };
      
      res.writeHead(200);
      res.end(JSON.stringify(response));
      return;
    }
    
    next?.();
  };
}

export default createCertificateServerMiddleware;
