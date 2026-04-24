/**
 * server/index.ts
 * CAI ELEVATION V7 — Express Host Server
 *
 * Routes:
 *   GET  /api/stream    → SSE 로그 스트림 (프론트엔드 ConsoleLog 구독)
 *   POST /api/analyze   → Protocol A (Gemini Vision 분석, AEPLSchema 반환)
 *   POST /api/generate  → Protocol B (5-view 병렬 이미지 생성)
 *   GET  /*             → Vite dev는 proxy, production은 dist/ 정적 서빙
 */
import 'dotenv/config';
import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { log, logError, registerSSEClient } from './logger.js';
import { analyzeElevation } from './services/aiService.js';
import { generateElevationImages } from './services/imageGenService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT      = parseInt(process.env.SERVER_PORT ?? '3001', 10);
const DIST_DIR  = join(__dirname, '..', 'dist');

const app = express();
app.use(express.json({ limit: '30mb' }));

// ── CORS (Vite dev가 3000에서 3001로 fetch 시 필요) ──────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// ── SSE 로그 스트림 ───────────────────────────────────────────────────────────
app.get('/api/stream', (req, res) => {
  log('SERVER', `SSE client connected  [${req.ip}]`);
  registerSSEClient(res);
  // 연결 확인 ping
  res.write('event: connected\ndata: {"status":"ok"}\n\n');
});

// ── Protocol A: 건물 이미지 분석 ──────────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
  const { imageBase64, mimeType, prompt = '' } = req.body as {
    imageBase64: string;
    mimeType: string;
    prompt?: string;
  };

  if (!imageBase64 || !mimeType) {
    res.status(400).json({ error: 'imageBase64 and mimeType are required.' });
    return;
  }

  const sizeKB = Math.round((imageBase64.length * 3) / 4 / 1024);
  log('SERVER', `POST /api/analyze — ${mimeType} (~${sizeKB} KB)  prompt: "${prompt.slice(0, 40)}"`);

  try {
    const aepl = await analyzeElevation(imageBase64, mimeType, prompt);
    log('HAND', `Protocol A → B Handover — AEPL Schema v${aepl.aepl_schema_version} ready`);
    res.json({ success: true, aepl });
  } catch (err) {
    logError('SERVER', err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Protocol B: 5면 이미지 생성 ──────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const { aepl, originalImageBase64 } = req.body as {
    aepl: Record<string, unknown>;
    originalImageBase64: string;
  };

  if (!aepl || !originalImageBase64) {
    res.status(400).json({ error: 'aepl and originalImageBase64 are required.' });
    return;
  }

  log('SERVER', 'POST /api/generate — Protocol B starting...');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const images = await generateElevationImages(aepl as any, originalImageBase64);
    log('TMPL', 'CrossGrid template payload ready — 5 images dispatched to frontend');
    res.json({ success: true, images });
  } catch (err) {
    logError('SERVER', err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ── 정적 파일 서빙 (production build) ────────────────────────────────────────
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (_req, res) => res.sendFile(join(DIST_DIR, 'index.html')));
  log('SERVER', `Serving production build from ${DIST_DIR}`);
} else {
  app.get('/', (_req, res) => {
    res.json({ message: 'CAI ELEVATION V7 API — run Vite on port 3000 for the frontend.' });
  });
}

// ── 서버 시작 ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  process.stdout.write('\n');
  log('SERVER', '╔════════════════════════════════════════════════╗');
  log('SERVER', '║  CAI ELEVATION V7 — DETERMINISTIC BIM COMPILER ║');
  log('SERVER', `║  Host: http://localhost:${PORT}                    ║`);
  log('SERVER', '║  API:  /api/stream  /api/analyze  /api/generate ║');
  log('SERVER', '╚════════════════════════════════════════════════╝');
  process.stdout.write('\n');
});
