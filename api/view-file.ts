/**
 * Proxy para servir archivos de Supabase Storage con Content-Disposition: inline
 * Esto permite que los archivos HTML, PDF, etc. se abran en el navegador
 * en vez de forzar la descarga.
 * 
 * Uso: /api/view-file?url=https://xxx.supabase.co/storage/v1/object/public/...
 */
module.exports = async function handler(req: any, res: any) {
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = req.query.url;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  // Decodificar la URL si viene codificada
  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    decodedUrl = url;
  }

  // Validar que la URL es de Supabase Storage
  if (!decodedUrl.includes('supabase.co/storage/')) {
    return res.status(400).json({ error: 'Invalid URL - must be a Supabase Storage URL', received: decodedUrl });
  }

  try {
    // Obtener el archivo de Supabase
    const response = await fetch(decodedUrl, {
      headers: {
        'Accept': '*/*',
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Failed to fetch file from Supabase',
        status: response.status,
        statusText: response.statusText
      });
    }

    // Obtener el tipo de contenido de la respuesta
    let contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Obtener el nombre del archivo de la URL
    const urlParts = decodedUrl.split('/');
    const fileName = (urlParts[urlParts.length - 1] || 'file').split('?')[0];
    const fileExt = fileName.split('.').pop()?.toLowerCase();

    // Si Supabase devuelve octet-stream, intentar detectar por extensión
    if (contentType === 'application/octet-stream' && fileExt) {
      const extToMime: Record<string, string> = {
        'html': 'text/html; charset=utf-8',
        'htm': 'text/html; charset=utf-8',
        'pdf': 'application/pdf',
        'txt': 'text/plain; charset=utf-8',
        'css': 'text/css; charset=utf-8',
        'js': 'text/javascript; charset=utf-8',
        'json': 'application/json; charset=utf-8',
        'xml': 'application/xml; charset=utf-8',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
      };
      contentType = extToMime[fileExt] || contentType;
    }

    // Determinar si el archivo se puede mostrar inline
    const inlineTypes = [
      'text/html',
      'text/plain',
      'text/css',
      'text/javascript',
      'application/pdf',
      'application/json',
      'application/xml',
      'image/',
      'video/',
      'audio/',
    ];

    const canInline = inlineTypes.some(type => contentType.includes(type));

    // Configurar headers para mostrar en navegador
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', canInline ? 'inline' : `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    // Obtener el body y enviarlo
    const buffer = await response.arrayBuffer();
    return res.status(200).send(Buffer.from(buffer));

  } catch (error: any) {
    console.error('Error fetching file:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error'
    });
  }
};
