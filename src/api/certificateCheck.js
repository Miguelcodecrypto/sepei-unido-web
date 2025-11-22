/**
 * Middleware API para detección de certificados del cliente
 * Verifica si el navegador envía un certificado cliente TLS
 */

export default function certificateCheckHandler(req, res) {
  try {
    // En HTTPS, el servidor recibe información del certificado del cliente
    // Estos headers son agregados por el servidor/proxy cuando requiere cliente cert
    
    const clientCert = {
      subject: req.headers['x-ssl-client-subject'] || req.socket.getPeerCertificate?.()?.subject,
      issuer: req.headers['x-ssl-client-issuer'] || req.socket.getPeerCertificate?.()?.issuer,
      serial: req.headers['x-ssl-client-serial'] || req.socket.getPeerCertificate?.()?.serialNumber,
      fingerprint: req.headers['x-ssl-client-fingerprint'] || req.socket.getPeerCertificate?.()?.fingerprint,
      valid: req.socket.getPeerCertificate?.() ? true : false
    };

    // Si el navegador está en HTTPS y tiene certificado, informar
    if (clientCert.valid || clientCert.subject) {
      res.setHeader('X-SSL-Client-Subject', clientCert.subject || '');
      res.setHeader('X-SSL-Client-Issuer', clientCert.issuer || '');
      res.setHeader('X-SSL-Client-Serial', clientCert.serial || '');
      res.setHeader('X-SSL-Client-Thumbprint', clientCert.fingerprint || '');
      res.setHeader('X-Certificate-Detected', 'true');
      
      return res.json({
        certificateDetected: true,
        certificate: clientCert
      });
    }

    // Si no hay certificado
    res.setHeader('X-Certificate-Detected', 'false');
    res.json({
      certificateDetected: false,
      message: 'No se detectó certificado de cliente'
    });

  } catch (error) {
    console.error('Error en certificate check:', error);
    res.status(500).json({
      error: 'Error al verificar certificado',
      details: error.message
    });
  }
}
