/**
 * server/logger.ts
 * 터미널 컬러 출력 + SSE 브로드캐스터
 * 모든 서버 로그의 단일 진입점
 */
import { EventEmitter } from 'events';
import type { Response } from 'express';

// SSE 클라이언트 관리
const sseClients = new Set<Response>();

export const registerSSEClient = (res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  sseClients.add(res);
  res.on('close', () => sseClients.delete(res));
};

const broadcastSSE = (eventName: string, data: object) => {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try { client.write(payload); } catch { sseClients.delete(client); }
  });
};

// 터미널 ANSI 컬러 팔레트
const C = {
  cyan:    '\x1b[36m',
  yellow:  '\x1b[33m',
  green:   '\x1b[32m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  red:     '\x1b[31m',
  dim:     '\x1b[2m',
  bold:    '\x1b[1m',
  reset:   '\x1b[0m',
};

const PHASE_COLOR: Record<string, string> = {
  SERVER:   C.cyan,
  'A-P1':   C.yellow,
  'A-P2':   C.yellow,
  'A-P3':   C.yellow,
  'A-P4':   C.green,
  HAND:     C.magenta,
  'B-PARA': C.blue,
  'B-FRONT':C.blue,
  'B-REAR': C.blue,
  'B-RIGHT':C.blue,
  'B-LEFT': C.blue,
  'B-TOP':  C.blue,
  'B-DONE': C.green,
  TMPL:     C.green,
  ERROR:    C.red,
};

const PROGRESS_BAR: Record<string, string> = {
  'A-P1':   '███░░░░░░░',
  'A-P2':   '██████░░░░',
  'A-P3':   '████████░░',
  'A-P4':   '██████████',
  'B-PARA': '▶ PARALLEL',
  'B-FRONT':'░░░░░░░░░░',
  'B-REAR': '░░░░░░░░░░',
  'B-RIGHT':'░░░░░░░░░░',
  'B-LEFT': '░░░░░░░░░░',
  'B-TOP':  '░░░░░░░░░░',
  'B-DONE': '██████████',
};

export const log = (phase: string, message: string) => {
  const color   = PHASE_COLOR[phase] ?? C.dim;
  const tag     = `[${phase.padEnd(8)}]`;
  const ts      = new Date().toISOString().replace('T', ' ').split('.')[0];
  const bar     = PROGRESS_BAR[phase] ? ` ${C.dim}${PROGRESS_BAR[phase]}${C.reset}` : '';

  // 터미널 출력
  process.stdout.write(
    `${color}${C.bold}${tag}${C.reset} ${C.dim}${ts}${C.reset}${bar} ${message}\n`
  );

  // SSE 브로드캐스트 → 프론트엔드 ConsoleLog UI
  const uiMessage = `[${phase}] ${message}`;
  broadcastSSE('log', { phase, message: uiMessage, ts });
};

export const logError = (phase: string, error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  log('ERROR', `[${phase}] ${msg}`);
  broadcastSSE('error', { phase, message: msg });
};
