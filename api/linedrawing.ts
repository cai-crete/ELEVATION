/**
 * api/linedrawing.ts
 * CAI ELEVATION V7 — Vercel Serverless API Endpoint
 *
 * CAI_CANVAS로부터 5장의 입면 이미지를 받아 건축 라인드로잉으로 변환합니다.
 * Protocol LD: 이미지→이미지 변환 (Gemini multimodal)
 *
 * POST /api/linedrawing
 * Body: { images: { front, rear, right, left, top } }  ← data URI strings
 * Response: { success: true, data: { images: { front, rear, right, left, top } } }
 */
import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateLineDrawings } from '../server/services/lineDrawingService.js';
import type { GeneratedImages } from '../src/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
    return;
  }

  const { images } = req.body as { images: GeneratedImages };

  if (!images || typeof images !== 'object') {
    res.status(400).json({ success: false, error: '"images" object with 5 views is required.' });
    return;
  }

  const requiredViews: (keyof GeneratedImages)[] = ['front', 'rear', 'right', 'left', 'top'];
  const missing = requiredViews.filter(v => !images[v]);
  if (missing.length > 0) {
    res.status(400).json({ success: false, error: `Missing image views: ${missing.join(', ')}` });
    return;
  }

  try {
    const lineDrawings = await generateLineDrawings(images);

    res.status(200).json({
      success: true,
      data: { images: lineDrawings },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
