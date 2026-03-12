import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Proxy para servir archivos de Supabase Storage con Content-Disposition: inline
 * Esto permite que los archivos HTML, PDF, etc. se abran en el navegador
 * en vez de forzar la descarga.
 * 
 * Uso: /api/view-file?url=https://xxx.supabase.co/storage/v1/object/public/...
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  // Validar que la URL es de Supabase Storage
  if (!url.includes('supabase.co/storage/')) {
    return res.status(400).json({ error: 'Invalid URL - must be a Supabase Storage URL' });
  }

  try {
    // Obtener el archivo de Supabase
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch file' });
    }

    // Obtener el tipo de contenido
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Obtener el nombre del archivo de la URL
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1] || 'file';

    // Determinar si el archivo se puede mostrar inline
    const inlineTypes = [
      'text/html',
      'text/plain',
      'text/css',
      'text/javascript',
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
    ];

    const canInline = inlineTypes.some(type => contentType.includes(type.split('/')[0]) || contentType === type);

    // Configurar headers para mostrar en navegador
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', canInline ? 'inline' : `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    // Obtener el body y enviarlo
    const buffer = await response.arrayBuffer();
    res.status(200).send(Buffer.from(buffer));

  } catch (error) {
    console.error('Error fetching file:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
