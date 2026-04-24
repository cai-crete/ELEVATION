/**
 * api/analyze.ts
 * Vercel Serverless — Protocol A
 * POST /api/analyze
 */
import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeElevation } from '../server/services/aiService.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ success: false, error: 'Method Not Allowed' }); return; }

  const { imageBase64, mimeType, prompt = '' } = req.body as {
    imageBase64: string;
    mimeType: string;
    prompt?: string;
  };

  if (!imageBase64 || !mimeType) {
    res.status(400).json({ success: false, error: 'imageBase64 and mimeType are required.' });
    return;
  }

  try {
    const aepl = await analyzeElevation(imageBase64, mimeType, prompt);
    res.status(200).json({ success: true, aepl });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}
