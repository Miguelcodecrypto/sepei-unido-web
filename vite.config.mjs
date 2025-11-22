import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    middlewareMode: false,
    middleware: [
      // Middleware para simular la solicitud de certificado del cliente
      (req, res, next) => {
        // Endpoint para verificar certificado
        if (req.url === '/api/certificate/verify') {
          console.log('[VITE] Solicitud de certificado recibida:', {
            method: req.method,
            url: req.url,
            headers: Object.keys(req.headers)
          });
          
          // En un servidor real con soporte de certificados de cliente (TLS),
          // aquí estaría disponible req.client.cert que contiene el certificado
          
          if (req.client?.cert) {
            // Certificado disponible
            const certData = {
              certificate: {
                subject: req.client.cert.subject,
                issuer: req.client.cert.issuer,
                serialNumber: req.client.cert.serialNumber,
                notBefore: req.client.cert.notBefore,
                notAfter: req.client.cert.notAfter,
              }
            };
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('X-Client-Cert', Buffer.from(JSON.stringify(certData.certificate)).toString('base64'));
            res.writeHead(200);
            res.end(JSON.stringify(certData));
          } else {
            // No hay certificado disponible
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(401);
            res.end(JSON.stringify({ error: 'No client certificate provided' }));
          }
          
          return;
        }
        
        next();
      }
    ]
  }
});

