/**
 * api/process.ts
 * CAI ELEVATION V7 — Vercel Serverless API Endpoint
 *
 * CAI_CANVAS(S2S 호출자)로부터 이미지를 받아:
 *   1. Protocol A (aiService)  — Gemini Vision으로 AEPLSchema 추출
 *   2. Protocol B (imageGenService) — 5-view 병렬 이미지 생성
 * 단일 JSON Payload로 반환합니다.
 *
 * POST /api/process
 * Body: { imageBase64: string, mimeType: string, prompt?: string }
 */
import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeElevation } from '../server/services/aiService.js';
import { generateElevationImages } from '../server/services/imageGenService.js';

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
    // Protocol A: 건물 이미지 분석 → AEPLSchema
    const aeplSchema = await analyzeElevation(imageBase64, mimeType, prompt);

    // Protocol B: AEPLSchema → 5-view 병렬 이미지 생성
    const images = await generateElevationImages(aeplSchema, imageBase64);

    res.status(200).json({
      success: true,
      data: { aeplSchema, images },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
