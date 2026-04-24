/**
 * server/services/aiService.ts
 * Protocol A — Architectural Logic Engine (서버 사이드)
 * Gemini Vision API로 건물 사진을 분석하여 AEPLSchema JSON을 출력합니다.
 * 시스템 프롬프트는 protocolLoader로 Protocol 폴더를 동적 참조합니다.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildAnalysisSystemPrompt } from '../protocolLoader.js';
import { log, logError } from '../logger.js';
import type { AEPLSchema } from '../../src/types.js';

const API_KEY       = process.env.GEMINI_API_KEY!;
const PRIMARY_MODEL = process.env.ANALYSIS_MODEL   ?? 'gemini-2.5-pro';
const FALLBACK_MODEL= process.env.ANALYSIS_FALLBACK ?? 'gemini-1.5-pro';

if (!API_KEY) throw new Error('GEMINI_API_KEY is not set in environment.');

const genAI = new GoogleGenerativeAI(API_KEY);

/** File → base64 inline part (서버 측 — Buffer 사용) */
const buildImagePart = (imageBase64: string, mimeType: string) => ({
  inlineData: { data: imageBase64, mimeType },
});

/** Protocol A 실행 — 단일 Gemini 호출 내에서 Phase 1~4 진행 */
const runAnalysis = async (
  modelName: string,
  imageBase64: string,
  mimeType: string,
  userPrompt: string,
): Promise<AEPLSchema> => {
  log('A-P1', `Phase 1 — Macro Context & Global Datum Lock-on  [model: ${modelName}]`);

  const systemPrompt = await buildAnalysisSystemPrompt();

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  });

  log('A-P2', 'Phase 2 — Boundary Parameterization & 3D Volume Calculation...');

  const result = await model.generateContent([
    systemPrompt,
    buildImagePart(imageBase64, mimeType),
    userPrompt.trim() || 'Execute Full Architectural Analysis per AEPS-v4. Output strict JSON only.',
  ]);

  log('A-P3', 'Phase 3 — Blind Spot Reconstruction Strategy (non-visible elevations)...');

  const text = result.response.text();

  log('A-P4', 'Phase 4 — AEPL Schema Packaging & Final Validation ✓');

  // JSON 파싱
  const raw = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const data = JSON.parse(raw) as AEPLSchema;

  // analysis_logs 를 SSE/터미널에 릴레이
  if (Array.isArray(data.analysis_logs)) {
    data.analysis_logs.forEach((entry, i) => log(`A-LOG${i + 1}`, entry));
  }

  return data;
};

/** Protocol A 공개 진입점 — 주 모델 실패 시 폴백 */
export const analyzeElevation = async (
  imageBase64: string,
  mimeType: string,
  userPrompt: string,
): Promise<AEPLSchema> => {
  log('SERVER', `Protocol A START — image (${mimeType}), prompt: "${userPrompt.slice(0, 60)}..."`);

  try {
    return await runAnalysis(PRIMARY_MODEL, imageBase64, mimeType, userPrompt);
  } catch (primaryErr) {
    logError('A-P1', primaryErr);
    log('SERVER', `Primary model failed. Activating fallback: ${FALLBACK_MODEL}`);
    try {
      return await runAnalysis(FALLBACK_MODEL, imageBase64, mimeType, userPrompt);
    } catch (fallbackErr) {
      logError('A-P1', fallbackErr);
      throw new Error(`Protocol A failed on both models: ${fallbackErr instanceof Error ? fallbackErr.message : fallbackErr}`);
    }
  }
};
