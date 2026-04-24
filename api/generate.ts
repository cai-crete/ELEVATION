/**
 * api/generate.ts
 * Vercel Serverless — Protocol B
 * POST /api/generate
 */
import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateElevationImages } from '../server/services/imageGenService.js';
import type { AEPLSchema } from '../src/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ success: false, error: 'Method Not Allowed' }); return; }

  const { aepl, originalImageBase64 } = req.body as {
    aepl: AEPLSchema;
    originalImageBase64: string;
  };

  if (!aepl || !originalImageBase64) {
    res.status(400).json({ success: false, error: 'aepl and originalImageBase64 are required.' });
    return;
  }

  try {
    const images = await generateElevationImages(aepl, originalImageBase64);
    res.status(200).json({ success: true, images });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}
