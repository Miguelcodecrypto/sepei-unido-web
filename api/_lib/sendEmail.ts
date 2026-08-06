/** Llama al endpoint interno /api/send-email desde otra función serverless. */
export async function sendEmailInternal(
  req: any,
  params: { to: string; subject: string; html: string; text?: string }
): Promise<boolean> {
  try {
    const host = req.headers.host;
    const protocol = host?.startsWith('localhost') ? 'http' : 'https';
    const response = await fetch(`${protocol}://${host}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.ok;
  } catch (error) {
    console.error('Error en sendEmailInternal:', error);
    return false;
  }
}
