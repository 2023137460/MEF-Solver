import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Fallback for sharing links (can integrate Upstash KV or return serialized id)
  if (req.method === 'POST') {
    const { state } = req.body || {};
    const id = Math.random().toString(36).substring(2, 9);
    return res.status(200).json({ id, url: `/?id=${id}` });
  }

  return res.status(200).json({ status: 'ok' });
}
