/**
 * api/stream.ts
 * Vercel Serverless — SSE 로그 스트림 (stub)
 * GET /api/stream
 *
 * Vercel 서버리스 환경에서는 지속 SSE 연결을 유지할 수 없으므로
 * connected 이벤트만 전송하고 종료합니다.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.write('event: connected\ndata: {"status":"ok"}\n\n');
  res.end();
}
