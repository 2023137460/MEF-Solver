import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const presetsPath = path.join(process.cwd(), 'public', 'presets', 'sebenta-15.json');
      if (fs.existsSync(presetsPath)) {
        const data = fs.readFileSync(presetsPath, 'utf8');
        return res.status(200).json(JSON.parse(data));
      }
      return res.status(200).json([]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      return res.status(200).json({ success: true, exercise: body });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
